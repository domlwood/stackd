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
import { StrategyPicker } from "@/features/analysis/components/strategy-picker"
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
      {/* Phones: one column. xl: assumptions left, sticky summary right. */}
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 xl:max-w-6xl">
        <DealHeader />
        <ListingSummary deal={data.deal} />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
          <AnalysisReady
            fallback={
              <div
                aria-busy="true"
                aria-label="Running the numbers"
                className="flex flex-col gap-4 xl:col-span-2"
              >
                <Skeleton className="h-40" />
                <Skeleton className="h-16" />
              </div>
            }
          >
            <div className="flex min-w-0 flex-col gap-4 xl:col-start-1">
              <StrategyPicker />
              <KeyNumbers />
            </div>
            <aside
              aria-labelledby="summary-heading"
              className="flex min-w-0 flex-col gap-2 xl:sticky xl:top-[calc(var(--header-height)+1.5rem)] xl:col-start-2 xl:row-span-2 xl:row-start-1"
            >
              <h2 id="summary-heading" className="text-sm font-medium">
                Investment summary
              </h2>
              <MetricStrip />
            </aside>
          </AnalysisReady>
          <div className="flex min-w-0 flex-col gap-4 xl:col-start-1">
            <DealTabs dealId={id} />
            {children}
            <p className="text-xs text-muted-foreground">
              Projections are estimates based on your assumptions. They
              aren&apos;t financial advice or a guarantee of returns.
            </p>
          </div>
        </div>
      </div>
      <InputSheet />
    </DealProvider>
  )
}
