import "server-only"

import { cache } from "react"

import { requireSession } from "@/lib/auth/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  settingsSchema,
  type WorkspaceSettings,
} from "@/features/settings/schemas"

export type Member = { userId: string; displayName: string; isYou: boolean }

export const listMembers = cache(async (): Promise<Member[]> => {
  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("workspace_member")
    .select("user_id, profile:user_id(display_name)")
    .eq("workspace_id", session.workspaceId)
    .order("joined_at")
  if (error)
    throw new Error(`Could not load workspace members: ${error.message}`)
  return data.map((row) => ({
    userId: row.user_id,
    displayName: row.profile?.display_name ?? "Member",
    isYou: row.user_id === session.userId,
  }))
})

export const getSettings = cache(async (): Promise<WorkspaceSettings> => {
  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("workspace_settings")
    .select("buy_box, defaults, stale_after_days, buyer_entity")
    .eq("workspace_id", session.workspaceId)
    .maybeSingle()
  if (error) throw new Error(`Could not load settings: ${error.message}`)
  return settingsSchema.parse({
    buyBox: data?.buy_box ?? {},
    defaults: data?.defaults ?? {},
    staleAfterDays: data?.stale_after_days,
    buyerEntity: data?.buyer_entity,
  })
})
