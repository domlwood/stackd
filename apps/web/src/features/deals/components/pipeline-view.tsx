"use client"

import Link from "next/link"
import { useOptimistic, useState, useTransition } from "react"
import { KanbanSquareIcon, PlusIcon, SearchIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import { PagePlaceholder } from "@/components/blocks/page-placeholder"
import { DEAL_VIEWS, inDealView, type DealView } from "../active"
import type { Unread } from "@/features/presence/types"
import type { PortfolioDeal } from "../portfolio"
import type { DealStatus } from "../schemas"
import { DealCard } from "./deal-card"
import { useStatusChange } from "./status-control"

function matchesSearch(deal: PortfolioDeal, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [deal.addressLine, deal.postcode ?? "", deal.agent ?? ""].some((s) =>
    s.toLowerCase().includes(q)
  )
}

/** Card wrapper owning its status-change dialog (passing needs a reason). */
function MovableCard({
  deal,
  onOptimisticMove,
  news,
}: {
  news?: { count: number; by: string }
  deal: PortfolioDeal
  onOptimisticMove: (id: string, status: DealStatus) => void
}) {
  const [, startTransition] = useTransition()
  const { request, dialog } = useStatusChange(deal.id, (status) =>
    startTransition(() => onOptimisticMove(deal.id, status))
  )
  return (
    <>
      <DealCard deal={deal} onMove={request} news={news} />
      {dialog}
    </>
  )
}

export function PipelineView({
  deals,
  unread = {},
  names = {},
}: {
  deals: PortfolioDeal[]
  /** Changes by others since you last opened each deal. */
  unread?: Record<string, Unread>
  /** Member names by user id. */
  names?: Record<string, string>
}) {
  const [query, setQuery] = useState("")
  const [view, setView] = useState<DealView>("all")
  const [optimistic, move] = useOptimistic(
    deals,
    (list: PortfolioDeal[], m: { id: string; status: DealStatus }) =>
      list.map((d) => (d.id === m.id ? { ...d, status: m.status } : d))
  )

  if (deals.length === 0) {
    return (
      <PagePlaceholder
        icon={KanbanSquareIcon}
        title="No deals yet"
        description="Paste a Rightmove link to analyse your first property."
      >
        <Button nativeButton={false} render={<Link href="/deals/new" />}>
          <PlusIcon aria-hidden />
          Analyse a property
        </Button>
      </PagePlaceholder>
    )
  }

  // Newest activity first (the query orders by updated_at).
  const shown = optimistic.filter(
    (d) => inDealView(d, view) && matchesSearch(d, query)
  )

  return (
    <section aria-labelledby="deals-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="deals-heading" className="mr-auto text-base font-medium">
          Deals{" "}
          <span className="text-muted-foreground tabular-nums">
            ({shown.length})
          </span>
        </h2>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <ToggleGroup
          aria-label="Which deals"
          variant="outline"
          value={[view]}
          onValueChange={(v: string[]) => v[0] && setView(v[0] as DealView)}
          className="self-start"
        >
          {(Object.keys(DEAL_VIEWS) as DealView[]).map((v) => (
            <ToggleGroupItem key={v} value={v} className="px-3 sm:px-4">
              {DEAL_VIEWS[v]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div role="search" className="min-w-0 sm:max-w-xs sm:flex-1">
          <label htmlFor="deal-search" className="sr-only">
            Search deals
          </label>
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              id="deal-search"
              type="search"
              placeholder="Search address or postcode"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </InputGroup>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          {query.trim()
            ? "No deals match your search."
            : view === "archived"
              ? "Nothing archived. Archive a deal from its menu to hide it from your deals."
              : "No deals yet. Tap + to analyse a property."}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((deal) => (
            <li key={deal.id} className="min-w-0">
              <MovableCard
                deal={deal}
                news={
                  unread[deal.id]
                    ? {
                        count: unread[deal.id]!.unread,
                        by: names[unread[deal.id]!.lastActorId] ?? "Someone",
                      }
                    : undefined
                }
                onOptimisticMove={(id, s) => move({ id, status: s })}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
