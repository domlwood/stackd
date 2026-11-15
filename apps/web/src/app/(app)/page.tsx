import type { Metadata } from "next"
import { KanbanSquareIcon } from "lucide-react"

import { PagePlaceholder } from "@/components/blocks/page-placeholder"
import { BuyingPowerSummary } from "@/features/finance/components/buying-power-summary"
import { getBuyingPower, listFundPots } from "@/features/finance/queries"

export const metadata: Metadata = { title: "Pipeline" }

export default async function PipelinePage() {
  const [power, pots] = await Promise.all([getBuyingPower(), listFundPots()])
  return (
    <div className="flex flex-col gap-6">
      <BuyingPowerSummary power={power} potCount={pots.length} />
      <PagePlaceholder
        icon={KanbanSquareIcon}
        title="No deals yet"
        description="Deals you capture will appear here, grouped by status."
      />
    </div>
  )
}
