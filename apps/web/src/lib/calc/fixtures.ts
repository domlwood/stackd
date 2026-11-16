import { selectTaxRules } from "./rules/schema"
import { ENGLAND_RULES } from "./rules/england-2026"
import type { AnalysisContext } from "./analyse"
import type { BuyBox, CalcProduct, DealInputs } from "./types"

/** Shared test fixtures: a hand-worked BRR deal (see analyse.test.ts for the arithmetic). */

export const RULES = selectTaxRules(ENGLAND_RULES, "2026-11-15")

const base: CalcProduct = {
  type: "cash",
  lender: "Test",
  name: "Test",
  rate: null,
  rateType: null,
  fixedMonths: null,
  termMonths: null,
  repayment: null,
  arrangementFeeKind: "fixed",
  arrangementFeePence: 0,
  arrangementFeePct: 0,
  feeAddedToLoan: false,
  brokerFeePence: 0,
  valuationFeePence: 0,
  maxLtv: null,
  monthlyRate: null,
  interestMode: null,
  minTermMonths: null,
  exitFeePct: null,
  stressRate: null,
  icrThreshold: null,
  minMonthsOwnedForRevaluation: null,
  ercBands: [],
}

export const CASH: CalcProduct = { ...base }

export const BRIDGE: CalcProduct = {
  ...base,
  type: "bridging",
  monthlyRate: 0.01,
  interestMode: "retained",
  termMonths: 12,
  minTermMonths: 3,
  maxLtv: 0.7,
  exitFeePct: 0.01,
  arrangementFeeKind: "pct",
  arrangementFeePct: 0.02,
  feeAddedToLoan: true,
  brokerFeePence: 100_000,
  valuationFeePence: 60_000,
}

export const BTL: CalcProduct = {
  ...base,
  type: "btl",
  rate: 0.05,
  rateType: "fixed",
  fixedMonths: 60,
  termMonths: 300,
  repayment: "interest_only",
  maxLtv: 0.75,
  arrangementFeeKind: "pct",
  arrangementFeePct: 0.03,
  feeAddedToLoan: true,
  valuationFeePence: 50_000,
  stressRate: 0.055,
  icrThreshold: 1.25,
  minMonthsOwnedForRevaluation: 6,
}

export const RESI: CalcProduct = {
  ...base,
  type: "residential",
  rate: 0.06,
  rateType: "fixed",
  fixedMonths: 24,
  termMonths: 300,
  repayment: "repayment",
  maxLtv: 0.75,
  arrangementFeePence: 99_900,
  ercBands: [
    { fromMonth: 0, toMonth: 12, pct: 0.03 },
    { fromMonth: 12, toMonth: 24, pct: 0.02 },
  ],
}

export const BUY_BOX: BuyBox = {
  minFlipRoi: 0.2,
  minFlipProfitPence: 2_000_000,
  maxMoneyLeftInPence: 1_500_000,
  minMonthlyCashflowPence: 20_000,
  marginalTolerance: 0.1,
}

export const INPUTS: DealInputs = {
  buyer: {
    entity: "personal",
    additionalProperty: true,
    nonResident: false,
    firstTimeBuyer: false,
    corporateRelief: false,
  },
  purchase: {
    pricePence: 20_000_000,
    legalPence: 180_000,
    surveyPence: 60_000,
    sourcingPence: 0,
    otherPence: 0,
    completionDate: "2026-11-15",
  },
  purchaseFinance: { ltv: 0.7 },
  refurb: {
    items: [
      { id: "r1", category: "Kitchen", description: "", costPence: 3_000_000 },
    ],
    budgetPence: 0,
    contingency: 0.1,
    months: 4,
  },
  holding: {
    councilTaxMonthlyPence: 15_000,
    utilitiesMonthlyPence: 10_000,
    insuranceMonthlyPence: 4_000,
    otherMonthlyPence: 0,
  },
  exit: { gdvPence: 30_000_000 },
  flip: {
    agentFee: 0.012,
    agentFeeVat: true,
    saleLegalPence: 150_000,
    monthsToSell: 4,
    taxMode: "income_tax",
    otherIncomePence: 5_027_000,
  },
  keep: {
    refinanceLtv: 0.75,
    rentMonthlyPence: 150_000,
    management: 0.1,
    voids: 0.05,
    maintenance: 0.05,
    insuranceMonthlyPence: 3_000,
    groundRentServiceMonthlyPence: 0,
    otherMonthlyPence: 0,
    refinanceLegalPence: 100_000,
  },
}

export const CTX: AnalysisContext = {
  purchaseProduct: BRIDGE,
  refiProduct: BTL,
  rules: RULES,
  buyBox: BUY_BOX,
}
