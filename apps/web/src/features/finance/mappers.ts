import type { Tables, TablesInsert } from "@/lib/supabase/database.types"
import type {
  ErcBand,
  FinanceProduct,
  FinanceProductInput,
  FundPot,
  FundPotInput,
} from "./schemas"

type ProductRow = Tables<"finance_product">
type BandRow = Pick<
  Tables<"erc_band">,
  "ordinal" | "from_month" | "to_month" | "pct"
>
type PotRow = Tables<"fund_pot">

/** PostgREST returns numeric as number, but be defensive about string encodings. */
const num = (value: number | string | null): number | null =>
  value === null ? null : Number(value)

export function rowToProduct(
  row: ProductRow,
  bands: readonly BandRow[]
): FinanceProduct {
  return {
    id: row.id,
    type: row.type as FinanceProduct["type"],
    lender: row.lender,
    name: row.name,
    arrangementFeeKind:
      row.arrangement_fee_kind as FinanceProduct["arrangementFeeKind"],
    arrangementFeePence: Number(row.arrangement_fee_pence),
    arrangementFeePct: Number(row.arrangement_fee_pct),
    feeAddedToLoan: row.fee_added_to_loan,
    brokerFeePence: Number(row.broker_fee_pence),
    valuationFeePence: Number(row.valuation_fee_pence),
    // ?? 0: tolerate a database that predates the cashback migration.
    cashbackPence: Number(row.cashback_pence ?? 0),
    maxLtv: num(row.max_ltv),
    rate: num(row.rate),
    rateType: row.rate_type as FinanceProduct["rateType"],
    fixedMonths: row.fixed_months,
    termMonths: row.term_months,
    repayment: row.repayment as FinanceProduct["repayment"],
    monthlyRate: num(row.monthly_rate),
    interestMode: row.interest_mode as FinanceProduct["interestMode"],
    minTermMonths: row.min_term_months,
    exitFeePct: num(row.exit_fee_pct),
    stressRate: num(row.stress_rate),
    icrThreshold: num(row.icr_threshold),
    minMonthsOwnedForRevaluation: row.min_months_owned_for_revaluation,
    ercBands: [...bands]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((band): ErcBand => ({
        fromMonth: band.from_month,
        toMonth: band.to_month,
        pct: Number(band.pct),
      })),
    notes: row.notes ?? "",
    lastReviewedAt: row.last_reviewed_at,
    archivedAt: row.archived_at,
    updatedAt: row.updated_at,
  }
}

/** Payload for the save_finance_product RPC (snake_case row + bands). */
export function productToRpcArgs(
  product: FinanceProductInput,
  workspaceId: string
) {
  const row = {
    id: product.id ?? null,
    workspace_id: workspaceId,
    type: product.type,
    lender: product.lender,
    name: product.name,
    rate: product.rate,
    rate_type: product.rateType,
    fixed_months: product.fixedMonths,
    term_months: product.termMonths,
    repayment: product.repayment,
    arrangement_fee_kind: product.arrangementFeeKind,
    arrangement_fee_pence: product.arrangementFeePence,
    arrangement_fee_pct: product.arrangementFeePct,
    fee_added_to_loan: product.feeAddedToLoan,
    broker_fee_pence: product.brokerFeePence,
    valuation_fee_pence: product.valuationFeePence,
    cashback_pence: product.cashbackPence,
    max_ltv: product.maxLtv,
    monthly_rate: product.monthlyRate,
    interest_mode: product.interestMode,
    min_term_months: product.minTermMonths,
    exit_fee_pct: product.exitFeePct,
    stress_rate: product.stressRate,
    icr_threshold: product.icrThreshold,
    min_months_owned_for_revaluation: product.minMonthsOwnedForRevaluation,
    notes: product.notes ? product.notes : null,
  }
  const bands = product.ercBands.map((band) => ({
    from_month: band.fromMonth,
    to_month: band.toMonth,
    pct: band.pct,
  }))
  return { p_product: row, p_bands: bands }
}

export function rowToPot(row: PotRow): FundPot {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as FundPot["kind"],
    ownerUserId: row.owner_user_id,
    amountPence: Number(row.amount_pence),
    note: row.note ?? undefined,
    updatedAt: row.updated_at,
  }
}

export function potToRow(
  pot: FundPotInput,
  workspaceId: string
): TablesInsert<"fund_pot"> {
  return {
    ...(pot.id ? { id: pot.id } : {}),
    workspace_id: workspaceId,
    name: pot.name,
    kind: pot.kind,
    owner_user_id: pot.ownerUserId,
    amount_pence: pot.amountPence,
    note: pot.note ? pot.note : null,
  }
}
