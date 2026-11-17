"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireSession } from "@/lib/auth/session"
import {
  fail,
  fromDbError,
  fromZodError,
  type ActionResult,
} from "@/lib/errors"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dealNoteInputSchema, type DealNoteValues } from "./schemas"

const idSchema = z.uuid()

function toRow(v: DealNoteValues) {
  const comp = v.kind === "comparable" ? v : null
  return {
    kind: v.kind,
    body: v.body,
    link_url: v.linkUrl,
    comp_address: comp?.address ?? null,
    comp_price_pence: comp?.pricePence ?? null,
    comp_status: comp?.status ?? null,
    comp_date: comp?.date ?? null,
    comp_beds: comp?.beds ?? null,
    comp_floor_area_sqm: comp?.floorAreaSqm ?? null,
  }
}

/** Notes live in the deal layout, so refresh the whole deal (incl. activity). */
function revalidateNotes(dealId: string) {
  revalidatePath(`/deals/${dealId}`, "layout")
}

export async function addDealNote(
  dealId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  if (!idSchema.safeParse(dealId).success)
    return fail("That deal doesn't exist.")
  const parsed = dealNoteInputSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error)
  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("deal_note")
    .insert({
      ...toRow(parsed.data),
      workspace_id: session.workspaceId,
      deal_id: dealId,
      author_id: session.userId,
    })
    .select("id")
    .single()
  if (error) return fromDbError(error)
  revalidateNotes(dealId)
  return { ok: true, data: { id: data.id } }
}

/** Authors edit their own notes (the database enforces it too). */
export async function updateDealNote(
  noteId: string,
  input: unknown
): Promise<ActionResult> {
  if (!idSchema.safeParse(noteId).success)
    return fail("That note doesn't exist.")
  const parsed = dealNoteInputSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error)
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("deal_note")
    .update(toRow(parsed.data))
    .eq("id", noteId)
    .select("deal_id")
    .maybeSingle()
  if (error) return fromDbError(error)
  if (!data) return fail("That note doesn't exist any more.")
  revalidateNotes(data.deal_id)
  return { ok: true }
}

/** Anyone in the workspace can pin a note to the top. */
export async function setDealNotePinned(
  noteId: string,
  pinned: boolean
): Promise<ActionResult> {
  if (!idSchema.safeParse(noteId).success)
    return fail("That note doesn't exist.")
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("deal_note")
    .update({ pinned: pinned === true })
    .eq("id", noteId)
    .select("deal_id")
    .maybeSingle()
  if (error) return fromDbError(error)
  if (!data) return fail("That note doesn't exist any more.")
  revalidateNotes(data.deal_id)
  return { ok: true }
}

export async function deleteDealNote(noteId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(noteId).success)
    return fail("That note doesn't exist.")
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("deal_note")
    .delete()
    .eq("id", noteId)
    .select("deal_id")
  if (error) return fromDbError(error)
  // RLS hides other people's notes from delete, so nothing comes back.
  if (!data.length)
    return fail("Only the person who wrote a note can delete it.")
  revalidateNotes(data[0]!.deal_id)
  return { ok: true }
}
