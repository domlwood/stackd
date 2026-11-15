"use client"

import Link from "next/link"
import {
  useMemo,
  useOptimistic,
  useState,
  useTransition,
  useSyncExternalStore,
} from "react"
import { KanbanSquareIcon, PlusIcon, TableIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import { OptionSelect } from "@/components/blocks/option-select"
import { PagePlaceholder } from "@/components/blocks/page-placeholder"
import { VERDICT_LABELS } from "@/components/blocks/verdict-badge"
import type { PortfolioDeal } from "../portfolio"
import {
  DEAL_STATUSES,
  DEAL_STATUS_LABELS,
  postcodeDistrict,
  type DealStatus,
} from "../schemas"
import { DealCard } from "./deal-card"
import { DealsTable } from "./deals-table"
import { useStatusChange } from "./status-control"

type Layout = "board" | "table"
const LAYOUT_KEY = "pipeline-layout"
const ALL = "all"

function readLayout(): Layout {
  try {
    return window.localStorage.getItem(LAYOUT_KEY) === "table"
      ? "table"
      : "board"
  } catch {
    return "board"
  }
}
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb)
  return () => window.removeEventListener("storage", cb)
}

/** Card wrapper owning its status-change dialog (passing needs a reason). */
function MovableCard({
  deal,
  onOptimisticMove,
}: {
  deal: PortfolioDeal
  onOptimisticMove: (id: string, status: DealStatus) => void
}) {
  const [, startTransition] = useTransition()
  const { request, dialog } = useStatusChange(deal.id, (status) =>
    startTransition(() => onOptimisticMove(deal.id, status))
  )
  return (
    <>
      <DealCard deal={deal} onMove={request} />
      {dialog}
    </>
  )
}

export function PipelineView({ deals }: { deals: PortfolioDeal[] }) {
  const storedLayout = useSyncExternalStore(
    subscribe,
    readLayout,
    () => "board" as Layout
  )
  const [layoutOverride, setLayoutOverride] = useState<Layout | null>(null)
  const layout = layoutOverride ?? storedLayout
  const [verdict, setVerdict] = useState<string>(ALL)
  const [area, setArea] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [optimistic, move] = useOptimistic(
    deals,
    (list: PortfolioDeal[], m: { id: string; status: DealStatus }) =>
      list.map((d) => (d.id === m.id ? { ...d, status: m.status } : d))
  )

  const areas = useMemo(() => {
    const set = new Set(
      deals
        .map((d) => postcodeDistrict(d.postcode))
        .filter((a): a is string => Boolean(a))
    )
    return Object.fromEntries([
      [ALL, "All areas"],
      ...[...set].sort().map((a) => [a, a]),
    ]) as Record<string, string>
  }, [deals])

  const filtered = optimistic.filter(
    (d) =>
      (verdict === ALL || d.summary.verdict === verdict) &&
      (area === ALL || postcodeDistrict(d.postcode) === area) &&
      (status === ALL || d.status === status)
  )

  const setLayout = (next: Layout) => {
    setLayoutOverride(next)
    try {
      window.localStorage.setItem(LAYOUT_KEY, next)
    } catch {
      // per-viewer convenience only
    }
  }

  if (deals.length === 0) {
    return (
      <PagePlaceholder
        icon={KanbanSquareIcon}
        title="No deals yet"
        description="Add a property to see the flip-vs-keep numbers."
      >
        <Button nativeButton={false} render={<Link href="/deals/new" />}>
          <PlusIcon aria-hidden />
          New deal
        </Button>
      </PagePlaceholder>
    )
  }

  return (
    <section aria-labelledby="pipeline-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="pipeline-heading" className="mr-auto text-base font-medium">
          Deals{" "}
          <span className="text-muted-foreground tabular-nums">
            ({filtered.length})
          </span>
        </h2>
        <ToggleGroup
          aria-label="Layout"
          variant="outline"
          size="sm"
          value={[layout]}
          onValueChange={(v: string[]) => v[0] && setLayout(v[0] as Layout)}
        >
          <ToggleGroupItem value="board" aria-label="Board">
            <KanbanSquareIcon aria-hidden />
            <span className="max-sm:sr-only">Board</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table">
            <TableIcon aria-hidden />
            <span className="max-sm:sr-only">Table</span>
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/deals/new" />}
        >
          <PlusIcon aria-hidden />
          New deal
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {layout === "table" ? (
          <div className="sm:w-40">
            <OptionSelect
              id="filter-status"
              value={status}
              onValueChange={setStatus}
              options={{ [ALL]: "All statuses", ...DEAL_STATUS_LABELS }}
            />
          </div>
        ) : null}
        <div className="sm:w-40">
          <OptionSelect
            id="filter-verdict"
            value={verdict}
            onValueChange={setVerdict}
            options={{ [ALL]: "All verdicts", ...VERDICT_LABELS }}
          />
        </div>
        <div className="sm:w-40">
          <OptionSelect
            id="filter-area"
            value={area}
            onValueChange={setArea}
            options={areas}
          />
        </div>
      </div>

      {layout === "table" ? (
        <DealsTable deals={filtered} />
      ) : (
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          {DEAL_STATUSES.map((st) => {
            const column = filtered.filter((d) => d.status === st)
            return (
              <section
                key={st}
                aria-label={`${DEAL_STATUS_LABELS[st]} (${column.length})`}
                className="flex w-[85vw] shrink-0 snap-start flex-col gap-2 rounded-xl bg-muted/40 p-2 sm:w-72"
              >
                <h3 className="flex items-center justify-between px-1 text-sm font-medium">
                  {DEAL_STATUS_LABELS[st]}
                  <span className="text-muted-foreground tabular-nums">
                    {column.length}
                  </span>
                </h3>
                {column.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                    Nothing here
                  </p>
                ) : null}
                {column.map((deal) => (
                  <MovableCard
                    key={deal.id}
                    deal={deal}
                    onOptimisticMove={(id, s) => move({ id, status: s })}
                  />
                ))}
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
