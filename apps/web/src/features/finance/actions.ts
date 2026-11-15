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
import { potToRow, productToRpcArgs } from "./mappers"
import {
  financeProductSchema,
  fundPotSchema,
  normaliseForType,
} from "./schemas"

const idSchema = z.uuid()

function revalidateFinance() {
  revalidatePath("/finance")
  revalidatePath("/")
}

// --- Fund pots -------------------------------------------------------------

export async function saveFundPot(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = fundPotSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error)

  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const row = potToRow(parsed.data, session.workspaceId)

  const { data, error } = parsed.data.id
    ? await supabase
        .from("fund_pot")
        .update(row)
        .eq("id", parsed.data.id)
        .select("id")
        .single()
    : await supabase.from("fund_pot").insert(row).select("id").single()
  if (error) return fromDbError(error)

  revalidateFinance()
  return { ok: true, data: { id: data.id } }
}

export async function deleteFundPot(id: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return fail("That fund pot doesn't exist.")

  await requireSession()
  const supabase = await createSupabaseServerClient()
  const { error, count } = await supabase
    .from("fund_pot")
    .delete({ count: "exact" })
    .eq("id", parsed.data)
  if (error) return fromDbError(error)
  if (count === 0) return fail("That fund pot was already removed.")

  revalidateFinance()
  return { ok: true }
}

// --- Finance products ------------------------------------------------------

export async function saveFinanceProduct(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = financeProductSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error)

  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc(
    "save_finance_product",
    productToRpcArgs(normaliseForType(parsed.data), session.workspaceId)
  )
  if (error) return fromDbError(error)

  revalidateFinance()
  return { ok: true, data: { id: data } }
}

async function updateProduct(
  id: unknown,
  patch: { archived_at?: string | null; last_reviewed_at?: string }
): Promise<ActionResult> {
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return fail("That product doesn't exist.")

  await requireSession()
  const supabase = await createSupabaseServerClient()
  const { error, count } = await supabase
    .from("finance_product")
    .update(patch, { count: "exact" })
    .eq("id", parsed.data)
  if (error) return fromDbError(error)
  if (count === 0)
    return fail("We couldn't find that product. It may have been removed.")

  revalidateFinance()
  return { ok: true }
}

export async function archiveFinanceProduct(id: unknown) {
  return updateProduct(id, { archived_at: new Date().toISOString() })
}

export async function restoreFinanceProduct(id: unknown) {
  return updateProduct(id, { archived_at: null })
}

/** Confirms the product's terms are current: resets the stale clock. */
export async function markProductReviewed(id: unknown) {
  return updateProduct(id, { last_reviewed_at: new Date().toISOString() })
}
