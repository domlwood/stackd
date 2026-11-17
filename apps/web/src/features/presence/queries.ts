import "server-only"

import { cache } from "react"

import { requireSession } from "@/lib/auth/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { groupChanged } from "./feed"
import type { DealViewer, FeedDeal, TodayFeed, Unread } from "./types"

/** Per deal: how many changes others made since you last opened it. */
export const getUnreadByDeal = cache(
  async (): Promise<Record<string, Unread>> => {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc("deal_unread")
    if (error) throw new Error(`Could not load what's new: ${error.message}`)
    return Object.fromEntries(
      data.map((r) => [
        r.deal_id,
        {
          unread: r.unread,
          lastActivityAt: r.last_activity_at,
          lastActorId: r.last_actor_id,
        },
      ])
    )
  }
)

const FEED_DAYS = 30

/** Today: what others changed since you last looked. */
export const getTodayFeed = cache(async (): Promise<TodayFeed> => {
  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const since = new Date(Date.now() - FEED_DAYS * 86_400_000).toISOString()

  const [mine, events, deals] = await Promise.all([
    // Your read markers: changes after these are new to you.
    supabase
      .from("deal_view")
      .select("deal_id, last_seen_at")
      .eq("user_id", session.userId),
    supabase
      .from("activity_event")
      .select(
        "id, deal_id, action, entity_type, field, old_value, new_value, actor_id, created_at"
      )
      .eq("workspace_id", session.workspaceId)
      .not("deal_id", "is", null)
      .not("actor_id", "is", null)
      .neq("actor_id", session.userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("deal")
      .select("id, address_line, cover_photo_url")
      .eq("workspace_id", session.workspaceId)
      .is("archived_at", null),
  ])
  for (const r of [mine, events, deals])
    if (r.error) throw new Error(`Could not load Today: ${r.error.message}`)

  const dealMap = new Map<string, FeedDeal>(
    deals.data!.map((d) => [
      d.id,
      {
        id: d.id,
        addressLine: d.address_line,
        coverPhotoUrl: d.cover_photo_url,
      },
    ])
  )
  const mySeen = new Map(mine.data!.map((v) => [v.deal_id, v.last_seen_at]))

  const changed = groupChanged(
    events.data!.map((e) => ({
      id: e.id,
      dealId: e.deal_id!,
      action: e.action,
      entityType: e.entity_type,
      field: e.field,
      oldValue: e.old_value,
      newValue: e.new_value,
      actorId: e.actor_id,
      createdAt: e.created_at,
    })),
    mySeen,
    dealMap
  )
  return { changed }
})
