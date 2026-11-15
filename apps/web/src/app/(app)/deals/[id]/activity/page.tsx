import { HistoryIcon } from "lucide-react"

import { Card } from "@workspace/ui/components/card"

import { PagePlaceholder } from "@/components/blocks/page-placeholder"
import { formatDateTime, formatRelative } from "@/lib/format/date"
import { describeActivity } from "@/features/deals/activity-format"
import { getDealWorkspace, listDealActivity } from "@/features/deals/queries"

export default async function DealActivityPage({
  params,
}: PageProps<"/deals/[id]/activity">) {
  const { id } = await params
  const [events, data] = await Promise.all([
    listDealActivity(id),
    getDealWorkspace(id),
  ])
  const name = (userId: string | null) => {
    const member = data.members.find((m) => m.userId === userId)
    return member ? (member.isYou ? "You" : member.displayName) : "System"
  }
  const rows = events
    .map((e) => ({ ...e, text: describeActivity(e, data.products) }))
    .filter((e) => e.text)

  if (rows.length === 0) {
    return (
      <PagePlaceholder
        icon={HistoryIcon}
        title="No activity yet"
        description="Every change to this deal is recorded here."
      />
    )
  }
  return (
    <Card className="gap-0 py-0">
      <ol className="divide-y">
        {rows.map((e) => (
          <li key={e.id} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
            <p>
              <span className="font-medium">{name(e.actorId)}</span> {e.text}
            </p>
            <time
              dateTime={e.createdAt}
              title={formatDateTime(e.createdAt)}
              className="text-xs text-muted-foreground"
            >
              {formatRelative(e.createdAt)}
            </time>
          </li>
        ))}
      </ol>
    </Card>
  )
}
