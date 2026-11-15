import type { Metadata } from "next"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

import { BuyingPowerSummary } from "@/features/finance/components/buying-power-summary"
import { FundPotsPanel } from "@/features/finance/components/fund-pots-panel"
import { ProductsPanel } from "@/features/finance/components/products-panel"
import {
  getBuyingPower,
  listFinanceProducts,
  listFundPots,
} from "@/features/finance/queries"
import { listMembers } from "@/features/workspace/queries"

export const metadata: Metadata = { title: "Finance" }

const TABS = ["pots", "products"] as const
type Tab = (typeof TABS)[number]

export default async function FinancePage({
  searchParams,
}: PageProps<"/finance">) {
  const { tab } = await searchParams
  const initialTab: Tab = TABS.includes(tab as Tab) ? (tab as Tab) : "pots"

  const [pots, products, members, power] = await Promise.all([
    listFundPots(),
    listFinanceProducts({ includeArchived: true }),
    listMembers(),
    getBuyingPower(),
  ])
  const staleCount = products.filter(
    (p) => !p.archivedAt && p.staleness.stale
  ).length

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <BuyingPowerSummary power={power} potCount={pots.length} />
      <Tabs defaultValue={initialTab} className="gap-4">
        <TabsList className="w-full sm:w-auto sm:self-start">
          <TabsTrigger value="pots" className="flex-1 sm:flex-none">
            Fund pots
          </TabsTrigger>
          <TabsTrigger value="products" className="flex-1 sm:flex-none">
            Products
            {staleCount > 0 ? (
              <span
                className="ml-1 rounded-full bg-warning/20 px-1.5 text-xs text-warning-foreground tabular-nums"
                aria-label={`${staleCount} stale`}
              >
                {staleCount}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pots">
          <FundPotsPanel pots={pots} members={members} />
        </TabsContent>
        <TabsContent value="products">
          <ProductsPanel products={products} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
