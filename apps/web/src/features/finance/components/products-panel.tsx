"use client"

import { useMemo, useOptimistic, useState } from "react"
import { ChevronRightIcon, LandmarkIcon, PlusIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import { PagePlaceholder } from "@/components/blocks/page-placeholder"
import { formatMoney } from "@/lib/format/money"
import { formatPercent } from "@/lib/format/percent"
import type { ProductListItem } from "../queries"
import { productTermsSummary } from "../rules"
import {
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPES,
  type ProductType,
} from "../schemas"
import { ProductSheet } from "./product-sheet"
import { StaleBadge } from "./stale-badge"

type Filter = "all" | ProductType
type Patch = { id: string; archivedAt?: string | null; reviewed?: boolean }

const FORMATTERS = {
  money: (p: number) => formatMoney(p),
  percent: formatPercent,
}

function applyPatch(
  products: ProductListItem[],
  patch: Patch
): ProductListItem[] {
  return products.map((p) => {
    if (p.id !== patch.id) return p
    return {
      ...p,
      ...(patch.archivedAt !== undefined
        ? { archivedAt: patch.archivedAt }
        : {}),
      ...(patch.reviewed
        ? {
            lastReviewedAt: new Date().toISOString(),
            staleness: { stale: false, daysSinceReview: 0 },
          }
        : {}),
    }
  })
}

export function ProductsPanel({ products }: { products: ProductListItem[] }) {
  const [optimistic, apply] = useOptimistic(products, applyPatch)
  const [filter, setFilter] = useState<Filter>("all")
  const [showArchived, setShowArchived] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const visible = useMemo(
    () =>
      optimistic.filter(
        (p) =>
          (filter === "all" || p.type === filter) &&
          (showArchived || !p.archivedAt)
      ),
    [optimistic, filter, showArchived]
  )
  const editing = optimistic.find((p) => p.id === editingId) ?? null
  const staleCount = optimistic.filter(
    (p) => !p.archivedAt && p.staleness.stale
  ).length
  const activeCount = optimistic.filter((p) => !p.archivedAt).length

  const openSheet = (id: string | null) => {
    setEditingId(id)
    setOpen(true)
  }

  return (
    <section aria-labelledby="products-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 id="products-heading" className="text-base font-medium">
            Finance products
          </h2>
          {staleCount > 0 ? (
            <p className="text-sm text-warning-foreground">
              {staleCount} product{staleCount === 1 ? "" : "s"} due a rate check
            </p>
          ) : null}
        </div>
        <Button size="sm" onClick={() => openSheet(null)}>
          <PlusIcon aria-hidden />
          Add product
        </Button>
      </div>

      {activeCount === 0 && !showArchived ? (
        <PagePlaceholder
          icon={LandmarkIcon}
          title="No finance products yet"
          description="Add the cash, bridging, residential and buy-to-let products you're likely to use, then reuse them across deals."
        >
          <Button onClick={() => openSheet(null)}>
            <PlusIcon aria-hidden />
            Add your first product
          </Button>
        </PagePlaceholder>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
              <ToggleGroup
                aria-label="Filter by type"
                variant="outline"
                size="sm"
                value={[filter]}
                onValueChange={(value: string[]) =>
                  setFilter((value[0] as Filter | undefined) ?? "all")
                }
              >
                <ToggleGroupItem value="all">All</ToggleGroupItem>
                {PRODUCT_TYPES.map((t) => (
                  <ToggleGroupItem key={t} value={t}>
                    {PRODUCT_TYPE_LABELS[t]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
              <Label htmlFor="show-archived" className="font-normal">
                Show archived
              </Label>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No products match this filter.
            </p>
          ) : (
            <Card className="gap-0 py-0">
              <ul className="divide-y">
                {visible.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => openSheet(product.id)}
                      className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none data-[archived=true]:opacity-60"
                      data-archived={Boolean(product.archivedAt)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium">{product.lender}</span>
                          <span className="text-muted-foreground">
                            {product.name}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground tabular-nums">
                          {productTermsSummary(product, FORMATTERS)}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Badge variant="secondary">
                            {PRODUCT_TYPE_LABELS[product.type]}
                          </Badge>
                          {product.ercBands.length > 0 ? (
                            <Badge variant="outline">ERCs</Badge>
                          ) : null}
                          {product.archivedAt ? (
                            <Badge variant="outline">Archived</Badge>
                          ) : (
                            <StaleBadge staleness={product.staleness} />
                          )}
                        </div>
                      </div>
                      <ChevronRightIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <ProductSheet
        open={open}
        onOpenChange={setOpen}
        product={editing}
        initialType={filter === "all" ? "bridging" : filter}
        onOptimistic={apply}
      />
    </section>
  )
}
