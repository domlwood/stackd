"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireSession } from "@/lib/auth/session"
import { serverEnv } from "@/lib/env"
import { getNewDealOptions, type NewDealOptions } from "./options"
import { fromDbError, fromZodError, type ActionResult } from "@/lib/errors"
import { nearestPostcode } from "@/lib/ingest/postcodes"
import {
  createRightmoveProvider,
  parseRightmoveUrl,
} from "@/lib/ingest/rightmove"
import {
  listingStatus,
  type ListingFields,
  type ListingResult,
} from "@/lib/ingest/types"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  dealDetailsSchema,
  type DealDetailsInput,
} from "@/features/deals/schemas"
import { getSettings } from "@/features/workspace/queries"
import { initialInputs, prefillFrom } from "./mapping"
import { findCachedSnapshot, saveSnapshot } from "./service"

export type CaptureResult =
  | { ok: true; dealId: string; existing: boolean; message?: string }
  | { ok: false; manual: true; message: string; prefill: DealDetailsInput }

const captureSchema = z.object({
  url: z.string().trim().min(1, "Paste a Rightmove link"),
  productId: z.uuid().nullable(),
})

const manualSchema = z.object({
  details: z.unknown(),
  productId: z.uuid().nullable(),
})

async function productFor(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productId: string | null
) {
  if (!productId) return null
  const { data } = await supabase
    .from("finance_product")
    .select("id, max_ltv")
    .eq("id", productId)
    .maybeSingle()
  return data
    ? {
        id: data.id,
        maxLtv: data.max_ltv === null ? null : Number(data.max_ltv),
      }
    : null
}

/**
 * Paste a Rightmove link + choose a purchase product → a fully analysed deal.
 * Never blocks on a scrape failure: falls back to manual entry with what we have.
 */
export async function captureFromLink(input: unknown): Promise<CaptureResult> {
  const parsed = captureSchema.safeParse(input)
  const blankPrefill = (url: string): DealDetailsInput => prefillFrom({}, url)
  if (!parsed.success)
    return {
      ok: false,
      manual: true,
      message: parsed.error.issues[0]?.message ?? "Paste a Rightmove link",
      prefill: blankPrefill(""),
    }

  const ref = parseRightmoveUrl(parsed.data.url)
  if (!ref)
    return {
      ok: false,
      manual: true,
      message:
        "That doesn't look like a Rightmove property link. Enter the details manually instead.",
      prefill: blankPrefill(parsed.data.url),
    }
  if (!serverEnv().INGEST_RIGHTMOVE_ENABLED) {
    return {
      ok: false,
      manual: true,
      message:
        "Reading Rightmove listings is switched off. Enter the details manually.",
      prefill: blankPrefill(ref.canonicalUrl),
    }
  }

  const session = await requireSession()
  const supabase = await createSupabaseServerClient()

  const { data: existing } = await supabase
    .from("deal")
    .select("id")
    .eq("workspace_id", session.workspaceId)
    .eq("listing_provider_id", ref.propertyId)
    .limit(1)
    .maybeSingle()
  if (existing)
    return {
      ok: true,
      dealId: existing.id,
      existing: true,
      message: "You've already added this listing, so we've opened it.",
    }

  // 1. Fetch (or reuse a recent snapshot) and parse.
  const cached = await findCachedSnapshot(supabase, session, ref.propertyId)
  let fields: Partial<ListingFields>
  let snapshotId: string | null
  let result: ListingResult | null = null
  if (cached) {
    fields = cached.fields
    snapshotId = cached.id
  } else {
    result = await createRightmoveProvider().fetch(ref.canonicalUrl)
    fields = result.fields
    // Rightmove often gives only the outcode: use the map pin for the nearest full postcode.
    if (!fields.postcode && fields.lat && fields.lng) {
      const nearest = await nearestPostcode(fields.lat.value, fields.lng.value)
      if (nearest)
        fields = {
          ...fields,
          postcode: {
            value: nearest.postcode,
            confidence: "medium",
            source: "Nearest postcode to the map pin",
          },
        }
    }
    result = {
      ...result,
      fields,
      status: result.status === "failed" ? "failed" : listingStatus(fields),
    }
    snapshotId = await saveSnapshot(supabase, session, result)
    if (result.status === "failed") {
      return {
        ok: false,
        manual: true,
        message:
          result.message ??
          "We couldn't read that listing. Enter the details manually.",
        prefill: blankPrefill(ref.canonicalUrl),
      }
    }
  }

  // 2. Create the deal from what we found.
  const details = dealDetailsSchema.safeParse(
    prefillFrom(fields, ref.canonicalUrl)
  )
  if (!details.success) {
    return {
      ok: false,
      manual: true,
      message:
        "We read the listing but some details are missing. Check them below.",
      prefill: prefillFrom(fields, ref.canonicalUrl),
    }
  }
  const d = details.data
  const photos = fields.photos?.value ?? []
  const { data: deal, error } = await supabase
    .from("deal")
    .insert({
      workspace_id: session.workspaceId,
      status: "active",
      address_line: d.addressLine,
      postcode: d.postcode,
      property_type: d.propertyType,
      tenure: d.tenure,
      beds: d.beds,
      baths: d.baths,
      floor_area_sqm: d.floorAreaSqm,
      asking_price_pence: d.askingPricePence,
      listing_url: ref.canonicalUrl,
      listing_provider_id: ref.propertyId,
      agent: d.agent || null,
      description: d.description || null,
      listed_at: fields.listedAt?.value ?? null,
      key_features: fields.keyFeatures?.value ?? [],
      photo_urls: photos,
      cover_photo_url: photos[0] ?? null,
      lat: fields.lat?.value ?? null,
      lng: fields.lng?.value ?? null,
    })
    .select("id")
    .single()
  if (error) {
    const failure = fromDbError(error)
    return {
      ok: false,
      manual: true,
      message: failure.message,
      prefill: prefillFrom(fields, ref.canonicalUrl),
    }
  }

  if (snapshotId)
    await supabase
      .from("listing_snapshot")
      .update({ deal_id: deal.id })
      .eq("id", snapshotId)
  const settings = await getSettings()
  const product = await productFor(supabase, parsed.data.productId)
  await supabase
    .from("deal_input")
    .insert(initialInputs({ session, dealId: deal.id, product, settings }))

  revalidatePath("/")
  const partial = (result?.status ?? cached?.status) === "partial"
  return {
    ok: true,
    dealId: deal.id,
    existing: false,
    message: partial
      ? "We imported the details we could find. Review the missing fields on the Listing tab."
      : undefined,
  }
}

/** Manual entry (option B): property details + chosen product. */
export async function createDealManually(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = manualSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error)
  const details = dealDetailsSchema.safeParse(parsed.data.details)
  if (!details.success) return fromZodError(details.error)
  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const d = details.data
  const ref = d.listingUrl ? parseRightmoveUrl(d.listingUrl) : null
  const { data: deal, error } = await supabase
    .from("deal")
    .insert({
      workspace_id: session.workspaceId,
      status: "active",
      address_line: d.addressLine,
      postcode: d.postcode,
      property_type: d.propertyType,
      tenure: d.tenure,
      beds: d.beds,
      baths: d.baths,
      floor_area_sqm: d.floorAreaSqm,
      asking_price_pence: d.askingPricePence,
      listing_url: ref?.canonicalUrl ?? (d.listingUrl || null),
      listing_provider_id: ref?.propertyId ?? null,
      agent: d.agent || null,
      description: d.description || null,
    })
    .select("id")
    .single()
  if (error) return fromDbError(error)
  const settings = await getSettings()
  const product = await productFor(supabase, parsed.data.productId)
  await supabase
    .from("deal_input")
    .insert(initialInputs({ session, dealId: deal.id, product, settings }))
  revalidatePath("/")
  return { ok: true, data: { id: deal.id } }
}

/** Products for the + sheet, fetched only when it opens (keeps every page light). */
export async function loadNewDealOptions(): Promise<NewDealOptions> {
  return getNewDealOptions()
}
