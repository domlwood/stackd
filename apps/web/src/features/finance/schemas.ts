import { z } from "zod"

/** Units: money = integer pence; rates/percentages = fractions (0.055 = 5.5%). */
const pence = z
  .number()
  .int("Must be whole pence")
  .nonnegative("Can't be negative")
const ratio = z
  .number()
  .min(0, "Can't be negative")
  .max(1, "Must be 100% or less")
const wholeMonths = (max: number) =>
  z.number().int("Whole months only").min(0).max(max)

export const MAX_ERC_BANDS = 20

// ---------------------------------------------------------------------------
// Fund pots
// ---------------------------------------------------------------------------

export const FUND_POT_KINDS = [
  "savings",
  "partner",
  "equity_release",
  "loan",
  "other",
] as const
export type FundPotKind = (typeof FUND_POT_KINDS)[number]

export const FUND_POT_KIND_LABELS: Record<FundPotKind, string> = {
  savings: "Savings",
  partner: "Partner contribution",
  equity_release: "Equity release",
  loan: "Loan",
  other: "Other",
}

export const fundPotSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Give the pot a name").max(80),
  kind: z.enum(FUND_POT_KINDS),
  ownerUserId: z.uuid("Choose an owner"),
  amountPence: pence,
  note: z.string().trim().max(500).optional(),
})

export type FundPotInput = z.infer<typeof fundPotSchema>
export type FundPot = Required<Pick<FundPotInput, "id">> &
  Omit<FundPotInput, "id"> & { updatedAt: string }

// ---------------------------------------------------------------------------
// ERC schedule
// ---------------------------------------------------------------------------

export const ercBandSchema = z.object({
  fromMonth: wholeMonths(600),
  toMonth: wholeMonths(600),
  pct: ratio,
})

export type ErcBand = z.infer<typeof ercBandSchema>

/** Bands must be non-empty ranges and contiguous: each starts where the previous ends. */
export function validateErcBands(
  bands: readonly ErcBand[]
): { index: number; message: string }[] {
  const problems: { index: number; message: string }[] = []
  bands.forEach((band, index) => {
    if (band.toMonth <= band.fromMonth) {
      problems.push({
        index,
        message: "End month must be after the start month",
      })
    }
    const previous = bands[index - 1]
    if (previous && band.fromMonth !== previous.toMonth) {
      problems.push({
        index,
        message: `Should start at month ${previous.toMonth} (where the previous band ends)`,
      })
    }
  })
  return problems
}

export const ercScheduleSchema = z
  .array(ercBandSchema)
  .max(MAX_ERC_BANDS, `At most ${MAX_ERC_BANDS} bands`)
  .superRefine((bands, ctx) => {
    for (const problem of validateErcBands(bands)) {
      ctx.addIssue({
        code: "custom",
        path: [problem.index, "fromMonth"],
        message: problem.message,
      })
    }
  })

/** Suggests the next band, continuing from the last one (12-month bands by default). */
export const DEFAULT_ERC_BAND_MONTHS = 12
export function nextErcBand(bands: readonly ErcBand[]): ErcBand {
  const last = bands.at(-1)
  const fromMonth = last?.toMonth ?? 0
  const lowerPct = last
    ? Math.max(0, Math.round((last.pct - 0.01) * 10_000) / 10_000)
    : 0.05
  return {
    fromMonth,
    toMonth: fromMonth + DEFAULT_ERC_BAND_MONTHS,
    pct: lowerPct,
  }
}

// ---------------------------------------------------------------------------
// Finance products
// ---------------------------------------------------------------------------

export const PRODUCT_TYPES = ["cash", "bridging", "residential", "btl"] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  cash: "Cash",
  bridging: "Bridging",
  residential: "Residential",
  btl: "Buy-to-let",
}

export const INTEREST_MODES = ["retained", "serviced", "rolled"] as const
export const INTEREST_MODE_LABELS: Record<
  (typeof INTEREST_MODES)[number],
  string
> = {
  retained: "Retained (deducted up front)",
  serviced: "Serviced (paid monthly)",
  rolled: "Rolled up (compounds, paid on exit)",
}

export const financeProductSchema = z
  .object({
    id: z.uuid().optional(),
    type: z.enum(PRODUCT_TYPES),
    lender: z.string().trim().min(1, "Enter the lender").max(80),
    name: z.string().trim().min(1, "Enter a product name").max(120),

    arrangementFeeKind: z.enum(["fixed", "pct"]),
    arrangementFeePence: pence,
    arrangementFeePct: ratio,
    feeAddedToLoan: z.boolean(),
    brokerFeePence: pence,
    valuationFeePence: pence,
    /** Paid to the borrower on completion; nets off the cash a deal ties up. */
    cashbackPence: pence,
    maxLtv: ratio.nullable(),

    rate: ratio.nullable(),
    rateType: z.enum(["fixed", "tracker"]).nullable(),
    fixedMonths: wholeMonths(600).nullable(),
    termMonths: z.number().int().min(1).max(600).nullable(),
    repayment: z.enum(["repayment", "interest_only"]).nullable(),

    monthlyRate: ratio.nullable(),
    interestMode: z.enum(INTEREST_MODES).nullable(),
    minTermMonths: wholeMonths(60).nullable(),
    exitFeePct: ratio.nullable(),

    stressRate: ratio.nullable(),
    icrThreshold: z.number().min(0).max(5).nullable(),
    minMonthsOwnedForRevaluation: wholeMonths(60).nullable(),

    ercBands: ercScheduleSchema,
    notes: z.string().trim().max(2000).optional(),
  })
  .superRefine((product, ctx) => {
    const require = (field: keyof typeof product, message: string) => {
      if (product[field] === null || product[field] === undefined)
        ctx.addIssue({ code: "custom", path: [field], message })
    }
    if (product.type === "residential" || product.type === "btl") {
      require("rate", "Enter the interest rate")
      require("rateType", "Choose fixed or tracker")
      require("termMonths", "Enter the mortgage term")
      require("repayment", "Choose repayment or interest-only")
      require("maxLtv", "Enter the maximum LTV")
      if (product.rateType === "fixed")
        require("fixedMonths", "Enter the fixed period")
    }
    if (product.type === "bridging") {
      require("monthlyRate", "Enter the monthly rate")
      require("interestMode", "Choose how interest is paid")
      require("maxLtv", "Enter the maximum LTV")
      require("exitFeePct", "Enter the exit fee (0 if none)")
    }
    if (product.type === "btl") {
      require("stressRate", "Enter the lender's stress rate")
      require("icrThreshold", "Enter the ICR threshold")
    }
    if (product.type === "cash" && product.ercBands.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["ercBands"],
        message: "Cash purchases don't have early repayment charges",
      })
    }
  })

export type FinanceProductInput = z.infer<typeof financeProductSchema>

export type FinanceProduct = FinanceProductInput & {
  id: string
  lastReviewedAt: string
  archivedAt: string | null
  updatedAt: string
}

/** Blank product of a given type, with sensible defaults per type. */
export function emptyProduct(type: ProductType): FinanceProductInput {
  const mortgage = type === "residential" || type === "btl"
  return {
    type,
    lender: type === "cash" ? "Own funds" : "",
    name: type === "cash" ? "Cash purchase" : "",
    arrangementFeeKind: "fixed",
    arrangementFeePence: 0,
    arrangementFeePct: 0,
    feeAddedToLoan: false,
    brokerFeePence: 0,
    valuationFeePence: 0,
    cashbackPence: 0,
    maxLtv: type === "cash" ? null : 0.75,
    rate: null,
    rateType: mortgage ? "fixed" : null,
    fixedMonths: mortgage ? 24 : null,
    termMonths: mortgage ? 300 : type === "bridging" ? 12 : null,
    repayment:
      type === "residential"
        ? "repayment"
        : type === "btl"
          ? "interest_only"
          : null,
    monthlyRate: null,
    interestMode: type === "bridging" ? "retained" : null,
    minTermMonths: type === "bridging" ? 3 : null,
    exitFeePct: type === "bridging" ? 0 : null,
    stressRate: null,
    icrThreshold: type === "btl" ? 1.25 : null,
    minMonthsOwnedForRevaluation: type === "btl" ? 6 : null,
    ercBands: [],
    notes: "",
  }
}

/** Fields that don't apply to a type are cleared so stale values can't leak into calcs. */
export function normaliseForType(
  product: FinanceProductInput
): FinanceProductInput {
  const mortgage = product.type === "residential" || product.type === "btl"
  const bridging = product.type === "bridging"
  const cash = product.type === "cash"
  return {
    ...product,
    maxLtv: cash ? null : product.maxLtv,
    rate: mortgage ? product.rate : null,
    rateType: mortgage ? product.rateType : null,
    fixedMonths:
      mortgage && product.rateType === "fixed" ? product.fixedMonths : null,
    termMonths: cash ? null : product.termMonths,
    repayment: mortgage ? product.repayment : null,
    monthlyRate: bridging ? product.monthlyRate : null,
    interestMode: bridging ? product.interestMode : null,
    minTermMonths: bridging ? product.minTermMonths : null,
    exitFeePct: bridging ? product.exitFeePct : null,
    stressRate: product.type === "btl" ? product.stressRate : null,
    icrThreshold: product.type === "btl" ? product.icrThreshold : null,
    minMonthsOwnedForRevaluation:
      product.type === "btl" ? product.minMonthsOwnedForRevaluation : null,
    ercBands: cash ? [] : product.ercBands,
    arrangementFeePence:
      product.arrangementFeeKind === "fixed" ? product.arrangementFeePence : 0,
    arrangementFeePct:
      product.arrangementFeeKind === "pct" ? product.arrangementFeePct : 0,
  }
}
