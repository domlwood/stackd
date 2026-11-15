import "server-only"

import { cache } from "react"

import { requireSession } from "@/lib/auth/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getSettings } from "@/features/workspace/queries"
import { rowToPot, rowToProduct } from "./mappers"
import {
  computeBuyingPower,
  productStaleness,
  type BuyingPower,
  type Commitment,
  type Staleness,
} from "./rules"
import type { FinanceProduct, FundPot } from "./schemas"

export type ProductListItem = FinanceProduct & {
  staleness: Staleness
  /** Deals that reference this product. Populated once deals exist (Phase 4). */
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

export const listFinanceProducts = cache(
  async ({
    includeArchived = false,
  }: { includeArchived?: boolean } = {}): Promise<ProductListItem[]> => {
    const session = await requireSession()
    const supabase = await createSupabaseServerClient()
    const settings = await getSettings()

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
        usedBy: [],
      }
    })
  }
)

/** Cash committed to deals in offer/accepted. Deals arrive in Phase 4; none yet. */
async function listCommitments(): Promise<Commitment[]> {
  return []
}

export const getBuyingPower = cache(async (): Promise<BuyingPower> => {
  const [pots, commitments] = await Promise.all([
    listFundPots(),
    listCommitments(),
  ])
  return computeBuyingPower(pots, commitments)
})
