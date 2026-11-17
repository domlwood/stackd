import type { Metadata } from "next"

import { PipelineView } from "@/features/deals/components/pipeline-view"
import { loadPortfolio } from "@/features/deals/portfolio"
import { getUnreadByDeal } from "@/features/presence/queries"
import { listMembers } from "@/features/workspace/queries"

export const metadata: Metadata = { title: "Deals" }

export default async function PipelinePage() {
  const [portfolio, unread, members] = await Promise.all([
    loadPortfolio(),
    getUnreadByDeal(),
    listMembers(),
  ])
  const names = Object.fromEntries(
    members.map((m) => [m.userId, m.isYou ? "You" : m.displayName])
  )
  return (
    <div className="flex flex-col gap-6">
      <PipelineView deals={portfolio.deals} unread={unread} names={names} />
    </div>
  )
}
