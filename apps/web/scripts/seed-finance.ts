import type { SupabaseClient } from "@supabase/supabase-js"

import { productToRpcArgs } from "@/features/finance/mappers"
import {
  emptyProduct,
  financeProductSchema,
  type FinanceProductInput,
} from "@/features/finance/schemas"
import type { Database } from "@/lib/supabase/database.types"

type Admin = SupabaseClient<Database>

const DAY_MS = 86_400_000
const STALE_SAMPLE_AGE_DAYS = 120

/** Sample terms only — lenders are placeholders so nobody mistakes them for real quotes. */
export const SAMPLE_PRODUCTS: {
  product: FinanceProductInput
  reviewedDaysAgo: number
}[] = [
  { product: emptyProduct("cash"), reviewedDaysAgo: 0 },
  {
    reviewedDaysAgo: STALE_SAMPLE_AGE_DAYS,
    product: {
      ...emptyProduct("bridging"),
      lender: "Example Bridging Ltd",
      name: "Light refurb bridge",
      monthlyRate: 0.0085,
      interestMode: "retained",
      minTermMonths: 3,
      termMonths: 12,
      maxLtv: 0.7,
      exitFeePct: 0.01,
      arrangementFeeKind: "pct",
      arrangementFeePct: 0.02,
      feeAddedToLoan: true,
      brokerFeePence: 100_000,
      valuationFeePence: 60_000,
    },
  },
  {
    reviewedDaysAgo: 10,
    product: {
      ...emptyProduct("residential"),
      lender: "Example Building Society",
      name: "2-year fix, 75% LTV",
      rate: 0.0449,
      rateType: "fixed",
      fixedMonths: 24,
      termMonths: 300,
      repayment: "repayment",
      maxLtv: 0.75,
      arrangementFeePence: 99_900,
      valuationFeePence: 0,
      ercBands: [
        { fromMonth: 0, toMonth: 12, pct: 0.03 },
        { fromMonth: 12, toMonth: 24, pct: 0.02 },
      ],
    },
  },
  {
    reviewedDaysAgo: 30,
    product: {
      ...emptyProduct("btl"),
      lender: "Example BTL Lender",
      name: "5-year fix, Ltd company",
      rate: 0.0539,
      rateType: "fixed",
      fixedMonths: 60,
      termMonths: 300,
      repayment: "interest_only",
      maxLtv: 0.75,
      arrangementFeeKind: "pct",
      arrangementFeePct: 0.03,
      feeAddedToLoan: true,
      valuationFeePence: 50_000,
      stressRate: 0.0539,
      icrThreshold: 1.25,
      minMonthsOwnedForRevaluation: 6,
      ercBands: [
        { fromMonth: 0, toMonth: 12, pct: 0.05 },
        { fromMonth: 12, toMonth: 24, pct: 0.04 },
        { fromMonth: 24, toMonth: 36, pct: 0.03 },
        { fromMonth: 36, toMonth: 48, pct: 0.02 },
        { fromMonth: 48, toMonth: 60, pct: 0.01 },
      ],
    },
  },
]

export async function seedFinance(
  admin: Admin,
  workspaceId: string,
  users: { a: string; b: string }
) {
  const { count: potCount, error: potCountError } = await admin
    .from("fund_pot")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
  if (potCountError) throw potCountError

  if (!potCount) {
    const { error } = await admin.from("fund_pot").insert([
      {
        workspace_id: workspaceId,
        owner_user_id: users.a,
        name: "Savings",
        kind: "savings",
        amount_pence: 6_000_000,
      },
      {
        workspace_id: workspaceId,
        owner_user_id: users.b,
        name: "Savings",
        kind: "savings",
        amount_pence: 4_500_000,
      },
      {
        workspace_id: workspaceId,
        owner_user_id: users.a,
        name: "Remortgage equity",
        kind: "equity_release",
        amount_pence: 8_000_000,
        note: "Available once the home remortgage completes",
      },
    ])
    if (error) throw error
    console.log("✔ 3 fund pots")
  } else {
    console.log("• fund pots already present, skipped")
  }

  for (const { product, reviewedDaysAgo } of SAMPLE_PRODUCTS) {
    const valid = financeProductSchema.parse(product)
    const { data: existing, error: findError } = await admin
      .from("finance_product")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("lender", valid.lender)
      .eq("name", valid.name)
      .maybeSingle()
    if (findError) throw findError
    if (existing) continue

    const { p_product, p_bands } = productToRpcArgs(valid, workspaceId)
    const { id: _id, ...row } = p_product
    const { data: inserted, error } = await admin
      .from("finance_product")
      .insert({
        ...row,
        last_reviewed_at: new Date(
          Date.now() - reviewedDaysAgo * DAY_MS
        ).toISOString(),
      })
      .select("id")
      .single()
    if (error) throw error
    if (p_bands.length > 0) {
      const { error: bandError } = await admin.from("erc_band").insert(
        p_bands.map((band, ordinal) => ({
          ...band,
          ordinal,
          workspace_id: workspaceId,
          product_id: inserted.id,
        }))
      )
      if (bandError) throw bandError
    }
    console.log(`✔ product: ${valid.lender} · ${valid.name}`)
  }
}
