import type { FeedDeal, FeedEvent, InboxFeed } from "./types"

/**
 * Groups other people's activity into "changed since you last looked", per
 * deal: events after your last visit (or all of them if you've never opened
 * it). Pure, so it's tested without a database.
 */
export function groupChanged(
  events: readonly (FeedEvent & { dealId: string })[],
  mySeen: ReadonlyMap<string, string>,
  deals: ReadonlyMap<string, FeedDeal>,
  perDeal = 3
): InboxFeed["changed"] {
  const groups = new Map<string, FeedEvent[]>()
  for (const e of events) {
    const deal = deals.get(e.dealId)
    if (!deal) continue
    const seen = mySeen.get(e.dealId)
    if (seen && e.createdAt <= seen) continue
    const list = groups.get(e.dealId) ?? []
    list.push(e)
    groups.set(e.dealId, list)
  }
  return [...groups.entries()]
    .map(([dealId, list]) => {
      const sorted = [...list].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      )
      return {
        deal: deals.get(dealId)!,
        events: sorted.slice(0, perDeal),
        total: sorted.length,
      }
    })
    .sort((a, b) =>
      b.events[0]!.createdAt.localeCompare(a.events[0]!.createdAt)
    )
}

/** "Morning", "Afternoon" or "Evening" in UK time. */
export function greeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/London",
    }).format(now)
  )
  return hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening"
}

export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || displayName
}
