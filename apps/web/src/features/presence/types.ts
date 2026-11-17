export type DealViewer = { userId: string; lastSeenAt: string }

export type Unread = {
  unread: number
  lastActivityAt: string
  /** Who made the most recent of those changes. */
  lastActorId: string
}

export type FeedEvent = {
  id: number
  action: string
  entityType: string
  field: string | null
  oldValue: unknown
  newValue: unknown
  actorId: string | null
  createdAt: string
}

export type FeedDeal = {
  id: string
  addressLine: string
  coverPhotoUrl: string | null
}

export type TodayFeed = {
  /** Deals your partner changed since you last opened them, newest first. */
  changed: { deal: FeedDeal; events: FeedEvent[]; total: number }[]
}
