import "server-only"

import { cache } from "react"

import { requireSession } from "@/lib/auth/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getSettings } from "@/features/workspace/queries"
import { rowToPot, rowToProduct } from "./mappers"
import { loadPortfolio } from "@/features/deals/portfolio"
import { productStaleness, type BuyingPower, type Staleness } from "./rules"
import type { FinanceProduct, FundPot } from "./schemas"

export type ProductListItem = FinanceProduct & {
  staleness: Staleness
  /** Deals that reference this product (Agreed view). */
  usedBy: { dealId: string; label: string }[]
}

export const listFundPots = cache(async (): Promise<FundPot[]> => {
  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("fund_pot")
    .select("*")
    .eq("workspace_id", session.workspaceId)
    .order("created_at")
  if (error) throw new Error(`Could not load fund pots: ${error.message}`)
  return data.map(rowToPot)
})

/**
 * Active products only, without "used by" lists, so no portfolio analysis:
 * cheap enough for the new-deal flow (Workers CPU budget).
 */
export const listActiveProducts = cache(async (): Promise<FinanceProduct[]> => {
  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("finance_product")
    .select("*, erc_band(ordinal, from_month, to_month, pct)")
    .eq("workspace_id", session.workspaceId)
    .is("archived_at", null)
    .order("type")
    .order("lender")
  if (error)
    throw new Error(`Could not load finance products: ${error.message}`)
  return data.map(({ erc_band, ...row }) => rowToProduct(row, erc_band))
})

export const listFinanceProducts = cache(
  async ({
    includeArchived = false,
  }: { includeArchived?: boolean } = {}): Promise<ProductListItem[]> => {
    const session = await requireSession()
    const supabase = await createSupabaseServerClient()
    const [settings, portfolio] = await Promise.all([
      getSettings(),
      loadPortfolio(),
    ])

    let query = supabase
      .from("finance_product")
      .select("*, erc_band(ordinal, from_month, to_month, pct)")
      .eq("workspace_id", session.workspaceId)
      .order("type")
      .order("lender")
    if (!includeArchived) query = query.is("archived_at", null)

    const { data, error } = await query
    if (error)
      throw new Error(`Could not load finance products: ${error.message}`)

    const now = new Date()
    return data.map(({ erc_band, ...row }) => {
      const product = rowToProduct(row, erc_band)
      return {
        ...product,
        staleness: productStaleness(
          product.lastReviewedAt,
          settings.staleAfterDays,
          now
        ),
        usedBy: portfolio.usedBy[product.id] ?? [],
      }
    })
  }
)

/** Buying power = the total in your fund pots (nothing is held back per deal). */
export const getBuyingPower = cache(
  async (): Promise<BuyingPower> => (await loadPortfolio()).buyingPower
)
