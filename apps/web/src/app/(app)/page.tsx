import type { Metadata } from "next"

import { BuyingPowerSummary } from "@/features/finance/components/buying-power-summary"
import { PipelineView } from "@/features/deals/components/pipeline-view"
import { loadPortfolio } from "@/features/deals/portfolio"

export const metadata: Metadata = { title: "Pipeline" }

export default async function PipelinePage() {
  const portfolio = await loadPortfolio()
  return (
    <div className="flex flex-col gap-6">
      <BuyingPowerSummary
        power={portfolio.buyingPower}
        potCount={portfolio.pots.length}
      />
      <PipelineView deals={portfolio.deals} />
    </div>
  )
}
