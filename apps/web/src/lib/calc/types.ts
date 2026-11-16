/**
 * Calculation engine types. The engine is PURE: no I/O, no framework, no DB.
 * Units: money = integer pence; rates = fractions (0.055 = 5.5%); durations = whole months.
 */

export type Pence = number
export type Ratio = number
export type Months = number

export type FigureUnit = "pence" | "ratio" | "months" | "multiple" | "flag"

/**
 * A number with its working. Every output the UI shows is a Figure so it can
 * be expanded into children, and its `inputs` link back to editable input keys.
 */
export type Figure = {
  key: string
  label: string
  value: number
  unit: FigureUnit
  /** Plain-maths description, e.g. "GDV − sale costs − redemption − cash invested". */
  formula?: string
  /** Input keys (lib/inputs registry) that feed this figure directly. */
  inputs?: string[]
  children?: Figure[]
  note?: string
}

export type ProductType = "cash" | "bridging" | "residential" | "btl"

/** Structural subset of a finance product the engine needs (FinanceProduct satisfies it). */
export type CalcProduct = {
  id?: string
  type: ProductType
  lender: string
  name: string
  rate: Ratio | null
  rateType: "fixed" | "tracker" | null
  fixedMonths: Months | null
  termMonths: Months | null
  repayment: "repayment" | "interest_only" | null
  arrangementFeeKind: "fixed" | "pct"
  arrangementFeePence: Pence
  arrangementFeePct: Ratio
  feeAddedToLoan: boolean
  brokerFeePence: Pence
  valuationFeePence: Pence
  /** Lender cashback paid on completion. */
  cashbackPence: Pence
  maxLtv: Ratio | null
  monthlyRate: Ratio | null
  interestMode: "retained" | "serviced" | "rolled" | null
  minTermMonths: Months | null
  exitFeePct: Ratio | null
  stressRate: Ratio | null
  icrThreshold: number | null
  minMonthsOwnedForRevaluation: Months | null
  ercBands: readonly { fromMonth: Months; toMonth: Months; pct: Ratio }[]
}

export type BuyerEntity = "personal" | "ltd"
export type TaxMode = "income_tax" | "cgt" | "corp_tax" | "main_residence"

/**
 * How the deal is meant to end. "live_in_sell": buy as your home on a
 * residential mortgage, refurb while living there, sell. "flip": buy, refurb,
 * sell. "brr": compare flipping with refinancing and keeping it as a let.
 */
export type Strategy = "live_in_sell" | "flip" | "brr"

export type RefurbItem = {
  id: string
  category: string
  description: string
  costPence: Pence
}

/** Fully-resolved inputs for one view (Agreed or a user's proposals). */
export type DealInputs = {
  plan: { strategy: Strategy }
  buyer: {
    entity: BuyerEntity
    additionalProperty: boolean
    nonResident: boolean
    /** Personal buyer(s) who have never owned a home anywhere, buying to live in. */
    firstTimeBuyer: boolean
    /** Ltd only: relief from the 17% flat rate (e.g. property rental business). */
    corporateRelief: boolean
  }
  purchase: {
    pricePence: Pence
    legalPence: Pence
    surveyPence: Pence
    sourcingPence: Pence
    otherPence: Pence
    /** Date the purchase is expected to complete (ISO date). Selects tax rules. */
    completionDate: string
  }
  purchaseFinance: { ltv: Ratio }
  refurb: {
    items: readonly RefurbItem[]
    /** Single refurb figure, used when there are no line items. */
    budgetPence: Pence
    contingency: Ratio
    months: Months
  }
  holding: {
    councilTaxMonthlyPence: Pence
    utilitiesMonthlyPence: Pence
    insuranceMonthlyPence: Pence
    otherMonthlyPence: Pence
  }
  exit: { gdvPence: Pence }
  flip: {
    agentFee: Ratio
    agentFeeVat: boolean
    saleLegalPence: Pence
    monthsToSell: Months
    taxMode: TaxMode
    /** Other taxable income the profit stacks on (income tax / CGT modes). */
    otherIncomePence: Pence
  }
  keep: {
    refinanceLtv: Ratio
    rentMonthlyPence: Pence
    management: Ratio
    voids: Ratio
    maintenance: Ratio
    insuranceMonthlyPence: Pence
    groundRentServiceMonthlyPence: Pence
    otherMonthlyPence: Pence
    refinanceLegalPence: Pence
  }
}

export type BuyBox = {
  minFlipRoi: Ratio
  minFlipProfitPence: Pence
  maxMoneyLeftInPence: Pence
  minMonthlyCashflowPence: Pence
  marginalTolerance: Ratio
}

export type Warning = { code: string; message: string; inputs?: string[] }
