import type { Metadata } from "next"
import type { ReactNode } from "react"

import { DealProvider } from "@/features/analysis/components/deal-provider"
import { InputSheet } from "@/features/analysis/components/input-sheet"
import { KeyNumbers } from "@/features/analysis/components/key-numbers"
import { MetricStrip } from "@/features/analysis/components/metric-strip"
import { DealHeader } from "@/features/deals/components/deal-header"
import { DealTabs } from "@/features/deals/components/deal-tabs"
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
        <KeyNumbers />
        <MetricStrip />
        <DealTabs dealId={id} />
        {children}
      </div>
      <InputSheet />
    </DealProvider>
  )
}
