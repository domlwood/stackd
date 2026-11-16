"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { splitEstimate } from "@/lib/calc/refurb"
import { requireSession } from "@/lib/auth/session"
import {
  fail,
  fromDbError,
  fromZodError,
  type ActionResult,
} from "@/lib/errors"
import { inputDef, refurbItemCostKey } from "@/lib/inputs/registry"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/database.types"
import {
  dealDetailsSchema,
  ESTIMATE_WEIGHTS,
  refurbItemSchema,
  setInputSchema,
  statusChangeSchema,
  type DealDetails,
} from "./schemas"

const idSchema = z.uuid()

function revalidateDeal(dealId?: string) {
  if (dealId) revalidatePath(`/deals/${dealId}`, "layout")
  revalidatePath("/")
  revalidatePath("/finance")
}

function detailsToRow(d: DealDetails) {
  return {
    address_line: d.addressLine,
    postcode: d.postcode,
    property_type: d.propertyType,
    tenure: d.tenure,
    beds: d.beds,
    baths: d.baths,
    floor_area_sqm: d.floorAreaSqm,
    asking_price_pence: d.askingPricePence,
    listing_url: d.listingUrl || null,
    agent: d.agent || null,
    description: d.description || null,
  }
}

// --- Deals -----------------------------------------------------------------

export async function createDeal(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = dealDetailsSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error)
  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("deal")
    .insert({
      ...detailsToRow(parsed.data),
      workspace_id: session.workspaceId,
      status: "analysing",
    })
    .select("id")
    .single()
  if (error) return fromDbError(error)
  revalidateDeal()
  return { ok: true, data: { id: data.id } }
}

export async function updateDealDetails(
  dealId: unknown,
  input: unknown
): Promise<ActionResult> {
  const id = idSchema.safeParse(dealId)
  const parsed = dealDetailsSchema.safeParse(input)
  if (!id.success) return fail("That deal doesn't exist.")
  if (!parsed.success) return fromZodError(parsed.error)
  await requireSession()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("deal")
    .update(detailsToRow(parsed.data))
    .eq("id", id.data)
  if (error) return fromDbError(error)
  revalidateDeal(id.data)
  return { ok: true }
}

export async function deleteDeal(dealId: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(dealId)
  if (!id.success) return fail("That deal doesn't exist.")
  await requireSession()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("deal").delete().eq("id", id.data)
  if (error) return fromDbError(error)
  revalidateDeal()
  return { ok: true }
}

export async function changeDealStatus(input: unknown): Promise<ActionResult> {
  const parsed = statusChangeSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error)
  await requireSession()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("deal")
    .update({
      status: parsed.data.status,
      passed_reason:
        parsed.data.status === "passed" ? (parsed.data.reason ?? null) : null,
    })
    .eq("id", parsed.data.dealId)
  if (error) return fromDbError(error)
  revalidateDeal(parsed.data.dealId)
  return { ok: true }
}

// --- Inputs (Agreed scope; proposals arrive in phase 6) ----------------------

export async function setDealInput(input: unknown): Promise<ActionResult> {
  const parsed = setInputSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error)
  const definition = inputDef(parsed.data.key)
  if (!definition) return fail("That isn't an input we recognise.")
  const value = definition.schema.safeParse(parsed.data.value)
  if (!value.success)
    return fail("That value isn't valid.", {
      value: value.error.issues[0]?.message ?? "Invalid value",
    })

  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("deal_input").upsert(
    {
      workspace_id: session.workspaceId,
      deal_id: parsed.data.dealId,
      key: parsed.data.key,
      scope: "agreed",
      user_id: null,
      value: value.data as Json,
      source_text: parsed.data.sourceText || null,
      source_url: parsed.data.sourceUrl || null,
      note: parsed.data.note || null,
    },
    { onConflict: "deal_id,key,scope,user_id" }
  )
  if (error) return fromDbError(error)
  revalidateDeal(parsed.data.dealId)
  return { ok: true }
}

/** Removes the Agreed value so the input falls back to its default. */
export async function resetDealInput(
  dealId: unknown,
  key: unknown
): Promise<ActionResult> {
  const id = idSchema.safeParse(dealId)
  const k = z.string().min(1).safeParse(key)
  if (!id.success || !k.success) return fail("That input doesn't exist.")
  await requireSession()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("deal_input")
    .delete()
    .eq("deal_id", id.data)
    .eq("key", k.data)
    .eq("scope", "agreed")
  if (error) return fromDbError(error)
  revalidateDeal(id.data)
  return { ok: true }
}

// --- Refurb lines ----------------------------------------------------------

export async function saveRefurbItem(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = refurbItemSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error)
  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const { dealId, id, category, description, costPence } = parsed.data

  let itemId = id
  if (itemId) {
    const { error } = await supabase
      .from("refurb_item")
      .update({ category, description: description || null })
      .eq("id", itemId)
    if (error) return fromDbError(error)
  } else {
    const { count } = await supabase
      .from("refurb_item")
      .select("id", { count: "exact", head: true })
      .eq("deal_id", dealId)
    const { data, error } = await supabase
      .from("refurb_item")
      .insert({
        workspace_id: session.workspaceId,
        deal_id: dealId,
        category,
        description: description || null,
        ordinal: count ?? 0,
      })
      .select("id")
      .single()
    if (error) return fromDbError(error)
    itemId = data.id
  }

  if (costPence !== undefined) {
    const { error } = await supabase.from("deal_input").upsert(
      {
        workspace_id: session.workspaceId,
        deal_id: dealId,
        key: refurbItemCostKey(itemId),
        scope: "agreed",
        user_id: null,
        value: costPence,
      },
      { onConflict: "deal_id,key,scope,user_id" }
    )
    if (error) return fromDbError(error)
  }
  revalidateDeal(dealId)
  return { ok: true, data: { id: itemId } }
}

export async function deleteRefurbItem(
  itemId: unknown,
  dealId: unknown
): Promise<ActionResult> {
  const id = idSchema.safeParse(itemId)
  const deal = idSchema.safeParse(dealId)
  if (!id.success || !deal.success)
    return fail("That refurb line doesn't exist.")
  await requireSession()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("refurb_item")
    .delete()
    .eq("id", id.data)
  if (error) return fromDbError(error)
  revalidateDeal(deal.data)
  return { ok: true }
}

const estimateSchema = z.object({
  dealId: z.uuid(),
  totalPence: z.number().int().positive(),
})

/** Converts a quick £/sq ft estimate into line items (adds to any existing lines). */
export async function applyRefurbEstimate(
  input: unknown
): Promise<ActionResult> {
  const parsed = estimateSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error)
  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const { dealId, totalPence } = parsed.data

  const { count } = await supabase
    .from("refurb_item")
    .select("id", { count: "exact", head: true })
    .eq("deal_id", dealId)
  const parts = splitEstimate(totalPence, ESTIMATE_WEIGHTS)
  const { data: items, error } = await supabase
    .from("refurb_item")
    .insert(
      parts.map((p, i) => ({
        workspace_id: session.workspaceId,
        deal_id: dealId,
        category: p.category,
        description: "From quick estimate",
        ordinal: (count ?? 0) + i,
      }))
    )
    .select("id, category")
  if (error) return fromDbError(error)

  const costs = items.map((item, i) => ({
    workspace_id: session.workspaceId,
    deal_id: dealId,
    key: refurbItemCostKey(item.id),
    scope: "agreed",
    user_id: null,
    value: parts[i]?.costPence ?? 0,
    source_text: "Quick estimate (£/sq ft)",
  }))
  const { error: costError } = await supabase.from("deal_input").insert(costs)
  if (costError) return fromDbError(costError)
  revalidateDeal(dealId)
  return { ok: true }
}
