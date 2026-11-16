import type { Metadata } from "next"
import type { ReactNode } from "react"

import { Skeleton } from "@workspace/ui/components/skeleton"

import {
  AnalysisReady,
  DealProvider,
} from "@/features/analysis/components/deal-provider"
import { InputSheet } from "@/features/analysis/components/input-sheet"
import { KeyNumbers } from "@/features/analysis/components/key-numbers"
import { MetricStrip } from "@/features/analysis/components/metric-strip"
import { DealHeader } from "@/features/deals/components/deal-header"
import { DealTabs } from "@/features/deals/components/deal-tabs"
import { ListingSummary } from "@/features/deals/components/listing-summary"
import { getDealWorkspace } from "@/features/deals/queries"

export async function generateMetadata({
  params,
}: LayoutProps<"/deals/[id]">): Promise<Metadata> {
  const { id } = await params
  const data = await getDealWorkspace(id)
  return { title: data.deal.addressLine }
}

export default async function DealLayout({
  params,
  children,
}: LayoutProps<"/deals/[id]"> & { children: ReactNode }) {
  const { id } = await params
  const data = await getDealWorkspace(id)
  return (
    <DealProvider data={data}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <DealHeader />
        <ListingSummary deal={data.deal} />
        <AnalysisReady
          fallback={
            <div
              aria-busy="true"
              aria-label="Running the numbers"
              className="flex flex-col gap-4"
            >
              <Skeleton className="h-40" />
              <Skeleton className="h-16" />
            </div>
          }
        >
          <KeyNumbers />
          <MetricStrip />
        </AnalysisReady>
        <DealTabs dealId={id} />
        {children}
      </div>
      <InputSheet />
    </DealProvider>
  )
}
