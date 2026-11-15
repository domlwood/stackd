import type { Metadata } from "next"

import { NewDealFlow } from "@/features/capture/components/new-deal-flow"
import { listFinanceProducts } from "@/features/finance/queries"

export const metadata: Metadata = { title: "New deal" }

/** Default purchase finance: a residential product (current focus), else the first non-cash one. */
const PREFERRED_TYPES = ["residential", "bridging", "btl", "cash"] as const

export default async function NewDealPage({
  searchParams,
}: PageProps<"/deals/new">) {
  const { url } = await searchParams
  const products = (await listFinanceProducts()).filter((p) => !p.archivedAt)
  const defaultProduct =
    PREFERRED_TYPES.map((t) => products.find((p) => p.type === t)).find(
      Boolean
    ) ?? null
  return (
    <div className="mx-auto w-full max-w-xl">
      <NewDealFlow
        products={products}
        defaultProductId={defaultProduct?.id ?? null}
        initialUrl={typeof url === "string" ? url : undefined}
      />
    </div>
  )
}
