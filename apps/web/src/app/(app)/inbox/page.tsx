import type { Metadata } from "next"
import type { Route } from "next"
import Link from "next/link"
import { CircleCheckIcon, HouseIcon } from "lucide-react"

import { Card } from "@workspace/ui/components/card"

import { requireSession } from "@/lib/auth/session"
import { formatDateTime, formatRelative } from "@/lib/format/date"
import { describeActivity } from "@/features/deals/activity-format"
import { listAllProducts } from "@/features/finance/queries"
import { firstName, greeting } from "@/features/presence/feed"
import { getInboxFeed } from "@/features/presence/queries"
import type { FeedDeal } from "@/features/presence/types"
import { listMembers } from "@/features/workspace/queries"

export const metadata: Metadata = { title: "Inbox" }

/**
 * Inbox: what your partner did since you last looked. Opening a deal marks
 * its changes as seen.
 */
export default async function InboxPage() {
  const [session, feed, members, products] = await Promise.all([
    requireSession(),
    getInboxFeed(),
    listMembers(),
    listAllProducts(),
  ])
  const name = (userId: string | null) => {
    const m = members.find((x) => x.userId === userId)
    return m ? (m.isYou ? "You" : firstName(m.displayName)) : "Someone"
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <p className="text-2xl font-semibold tracking-tight">
        {greeting()}, {firstName(session.displayName)}
      </p>

      <section aria-labelledby="new-heading" className="flex flex-col gap-3">
        <h2 id="new-heading" className="text-base font-semibold">
          New since you last looked
        </h2>
        {feed.changed.length === 0 ? (
          <Card
            size="sm"
            className="flex-row items-center gap-2 px-4 text-sm text-muted-foreground"
          >
            <CircleCheckIcon
              className="size-4 shrink-0 text-positive-foreground"
              aria-hidden
            />
            You&apos;re all caught up.
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {feed.changed.map(({ deal, events, total }) => (
              <li key={deal.id}>
                <Card
                  size="sm"
                  className="relative gap-2 px-4 transition-shadow focus-within:ring-2 focus-within:ring-ring hover:shadow-md"
                >
                  <DealLine deal={deal} />
                  <ul className="flex flex-col gap-1 text-sm">
                    {events.map((e) => {
                      const text = describeActivity(e, products)
                      return text ? (
                        <li key={e.id} className="flex flex-wrap gap-x-1.5">
                          <span>
                            <span className="font-medium">
                              {name(e.actorId)}
                            </span>{" "}
                            {text}
                          </span>
                          <time
                            dateTime={e.createdAt}
                            title={formatDateTime(e.createdAt)}
                            className="text-muted-foreground"
                          >
                            · {formatRelative(e.createdAt)}
                          </time>
                        </li>
                      ) : null
                    })}
                  </ul>
                  {total > events.length ? (
                    <p className="text-xs text-muted-foreground">
                      and {total - events.length} more
                    </p>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Thumb({ deal }: { deal: FeedDeal }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
      {deal.coverPhotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote listing photos, not optimised
        <img
          src={deal.coverPhotoUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        <HouseIcon className="size-4 text-muted-foreground" aria-hidden />
      )}
    </div>
  )
}

function DealLine({ deal }: { deal: FeedDeal }) {
  return (
    <div className="flex items-center gap-3">
      <Thumb deal={deal} />
      <Link
        href={`/deals/${deal.id}` as Route}
        prefetch={false}
        className="line-clamp-2 min-w-0 text-sm font-medium after:absolute after:inset-0 focus-visible:outline-none"
      >
        {deal.addressLine}
      </Link>
    </div>
  )
}
