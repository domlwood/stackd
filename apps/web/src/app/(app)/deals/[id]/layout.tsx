import type { Metadata } from "next"
import type { ReactNode } from "react"

import { DealProvider } from "@/features/analysis/components/deal-provider"
import { InputSheet } from "@/features/analysis/components/input-sheet"
import { DealHeader } from "@/features/deals/components/deal-header"
import { DealScrollReset } from "@/features/deals/components/deal-scroll-reset"
import { DealTabs } from "@/features/deals/components/deal-tabs"
import { getDealWorkspace } from "@/features/deals/queries"
import {
  NoteComposerBar,
  NotesPanel,
} from "@/features/notes/components/notes-view"
import { listDealNotes } from "@/features/notes/queries"
import { MarkSeen } from "@/features/presence/components/mark-seen"

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
  const [data, notes] = await Promise.all([
    getDealWorkspace(id),
    listDealNotes(id),
  ])
  return (
    <DealProvider data={data}>
      <DealScrollReset dealId={id} />
      <MarkSeen dealId={id} />
      {/* Phones: one column, notes from the bar at the bottom. xl: the deal
          on the left, the shared notes panel on the right. */}
      <div className="mx-auto grid w-full max-w-3xl gap-4 xl:max-w-6xl xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start xl:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <DealHeader />
          <DealTabs dealId={id} noteCount={notes.length} />
          {children}
          <p className="text-xs text-muted-foreground">
            Projections are estimates based on your assumptions. They
            aren&apos;t financial advice or a guarantee of returns.
          </p>
          <NoteComposerBar />
        </div>
        <aside
          aria-label="Notes"
          className="hidden max-h-[calc(100dvh-var(--header-height)-3rem)] min-w-0 overflow-y-auto overscroll-contain xl:sticky xl:top-[calc(var(--header-height)+1.5rem)] xl:flex xl:flex-col"
        >
          <NotesPanel notes={notes} />
        </aside>
      </div>
      <InputSheet />
    </DealProvider>
  )
}
