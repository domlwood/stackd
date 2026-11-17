"use server"

import { z } from "zod"

import { requireSession } from "@/lib/auth/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"

/**
 * Records that you've opened a deal (for "Alex viewed 2h ago" and unread
 * dots). Best effort: a failure never interrupts what you're doing.
 */
export async function markDealSeen(dealId: string): Promise<void> {
  if (!z.uuid().safeParse(dealId).success) return
  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const now = new Date().toISOString()
  const { error } = await supabase.from("deal_view").upsert(
    {
      deal_id: dealId,
      user_id: session.userId,
      workspace_id: session.workspaceId,
      last_seen_at: now,
      viewed_at: now,
    },
    { onConflict: "deal_id,user_id" }
  )
  if (error) console.error("[presence]", error.code, error.message)
}
