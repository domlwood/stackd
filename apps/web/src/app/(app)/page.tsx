import type { Metadata } from "next"

import { PipelineView } from "@/features/deals/components/pipeline-view"
import { loadPortfolio } from "@/features/deals/portfolio"

export const metadata: Metadata = { title: "Deals" }

export default async function PipelinePage() {
  const portfolio = await loadPortfolio()
  return (
    <div className="flex flex-col gap-6">
      <PipelineView deals={portfolio.deals} />
    </div>
  )
}
