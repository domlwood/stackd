import "server-only"

import { cache } from "react"

import { requireSession } from "@/lib/auth/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  buildAnalysis,
  summarise,
  type DealSummary,
} from "@/features/analysis/build"
import { rowToPot, rowToProduct } from "@/features/finance/mappers"
import {
  computeBuyingPower,
  type BuyingPower,
  type Commitment,
} from "@/features/finance/rules"
import type { FinanceProduct, FundPot } from "@/features/finance/schemas"
import { listTaxRuleRecords } from "@/features/settings/tax-rules"
import { getSettings } from "@/features/workspace/queries"
import { rowToDeal, rowToStoredInput } from "./mappers"
import { COMMITTED_STATUSES } from "./schemas"
import type { Deal, RefurbLineRecord } from "./types"

export type PortfolioDeal = Deal & { summary: DealSummary }

export type Portfolio = {
  deals: PortfolioDeal[]
  pots: FundPot[]
  products: FinanceProduct[]
  buyingPower: BuyingPower
  /** Deals referencing each product (Agreed view). */
  usedBy: Record<string, { dealId: string; label: string }[]>
  /** Total in pots minus everyone else's commitments: per-deal free buying power. */
  freeExcluding: (dealId: string) => number
}

export const todayIso = () => new Date().toISOString().slice(0, 10)

/**
 * Loads every deal with its Agreed inputs and analyses them all (pure, fast).
 * Feeds the pipeline, committed cash and product "used by" lists. Always fresh.
 */
export const loadPortfolio = cache(async (): Promise<Portfolio> => {
  const session = await requireSession()
  const supabase = await createSupabaseServerClient()
  const ws = session.workspaceId

  const [
    dealsRes,
    inputsRes,
    refurbRes,
    productsRes,
    potsRes,
    settings,
    ruleRecords,
  ] = await Promise.all([
    supabase
      .from("deal")
      .select("*")
      .eq("workspace_id", ws)
      .order("updated_at", { ascending: false }),
    supabase
      .from("deal_input")
      .select("*")
      .eq("workspace_id", ws)
      .eq("scope", "agreed"),
    supabase
      .from("refurb_item")
      .select("id, deal_id, category, description, ordinal")
      .eq("workspace_id", ws)
      .order("ordinal"),
    supabase
      .from("finance_product")
      .select("*, erc_band(ordinal, from_month, to_month, pct)")
      .eq("workspace_id", ws),
    supabase
      .from("fund_pot")
      .select("*")
      .eq("workspace_id", ws)
      .order("created_at"),
    getSettings(),
    listTaxRuleRecords(),
  ])
  for (const res of [dealsRes, inputsRes, refurbRes, productsRes, potsRes]) {
    if (res.error)
      throw new Error(`Could not load your deals: ${res.error.message}`)
  }

  const products = (productsRes.data ?? []).map(({ erc_band, ...row }) =>
    rowToProduct(row, erc_band)
  )
  const pots = (potsRes.data ?? []).map(rowToPot)
  const today = todayIso()
  const inputsByDeal = Map.groupBy(
    (inputsRes.data ?? []).map((r) => ({
      dealId: r.deal_id,
      input: rowToStoredInput(r),
    })),
    (r) => r.dealId
  )
  const linesByDeal = Map.groupBy(refurbRes.data ?? [], (r) => r.deal_id)

  const deals = (dealsRes.data ?? []).map(rowToDeal)
  const built = deals.map((deal) => {
    const refurbLines: RefurbLineRecord[] = (
      linesByDeal.get(deal.id) ?? []
    ).map((l) => ({
      id: l.id,
      category: l.category,
      description: l.description ?? "",
      ordinal: l.ordinal,
    }))
    return {
      deal,
      refurbLines,
      stored: (inputsByDeal.get(deal.id) ?? []).map((r) => r.input),
    }
  })

  const analyse = (b: (typeof built)[number], free: number | null) =>
    buildAnalysis({
      deal: b.deal,
      stored: b.stored,
      refurbLines: b.refurbLines,
      products,
      ruleRecords,
      settings,
      today,
      view: { kind: "agreed" },
      freeBuyingPowerPence: free,
      withSensitivity: false,
    })

  // Pass 1: cash required per deal → commitments.
  const first = built.map((b) => ({ b, result: analyse(b, null) }))
  const commitments: Commitment[] = first
    .filter(
      ({ b, result }) => COMMITTED_STATUSES.includes(b.deal.status) && result.ok
    )
    .map(({ b, result }) => ({
      dealId: b.deal.id,
      label: b.deal.addressLine,
      cashRequiredPence: result.ok ? result.analysis.cashRequired.value : 0,
    }))
  const buyingPower = computeBuyingPower(pots, commitments)
  const freeExcluding = (dealId: string) =>
    buyingPower.freePence +
    (commitments.find((c) => c.dealId === dealId)?.cashRequiredPence ?? 0)

  // Pass 2: affordability needs everyone else's commitments.
  const usedBy: Portfolio["usedBy"] = {}
  const portfolioDeals = first.map(({ b }) => {
    const result = analyse(b, freeExcluding(b.deal.id))
    if (result.ok) {
      for (const product of [result.purchaseProduct, result.refiProduct]) {
        if (!product?.id) continue
        const list = (usedBy[product.id] ??= [])
        if (!list.some((d) => d.dealId === b.deal.id))
          list.push({ dealId: b.deal.id, label: b.deal.addressLine })
      }
    }
    return { ...b.deal, summary: summarise(result) }
  })

  return {
    deals: portfolioDeals,
    pots,
    products,
    buyingPower,
    usedBy,
    freeExcluding,
  }
})
