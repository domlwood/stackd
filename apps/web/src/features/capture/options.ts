import "server-only"

import { listActiveProducts } from "@/features/finance/queries"
import type { FinanceProduct } from "@/features/finance/schemas"

export type NewDealOptions = {
  products: FinanceProduct[]
  defaultProductId: string | null
}

/** Default purchase finance: a residential product (current focus), else the first non-cash one. */
const PREFERRED_TYPES = ["residential", "bridging", "btl", "cash"] as const

export async function getNewDealOptions(): Promise<NewDealOptions> {
  const products = await listActiveProducts()
  const preferred =
    PREFERRED_TYPES.map((t) => products.find((p) => p.type === t)).find(
      Boolean
    ) ?? null
  return { products, defaultProductId: preferred?.id ?? null }
}
