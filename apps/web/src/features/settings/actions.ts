"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/auth/session"
import {
  fail,
  fromDbError,
  fromZodError,
  type ActionResult,
} from "@/lib/errors"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { settingsSchema } from "./schemas"

/**
 * Saves the whole settings object (buy box, default assumptions, buyer,
 * staleness). Defaults are applied live, so every deal that hasn't overridden
 * a number picks up the change.
 */
export async function updateSettings(input: unknown): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return fromZodError(parsed.error)
  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("workspace_settings")
    .update({
      buy_box: parsed.data.buyBox,
      defaults: parsed.data.defaults,
      stale_after_days: parsed.data.staleAfterDays,
      buyer_entity: parsed.data.buyerEntity,
    })
    .eq("workspace_id", session.workspaceId)
    .select("workspace_id")
  if (error) return fromDbError(error)
  if (!data?.length) return fail("We couldn't find your workspace settings.")
  // Verdicts, defaults and staleness show up on almost every page.
  revalidatePath("/", "layout")
  return { ok: true }
}
