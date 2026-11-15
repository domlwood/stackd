import {
  purchaseFinance,
  redeemPurchaseFinance,
  type PurchaseFinance,
} from "./finance"
import { analyseFlip, type FlipResult } from "./flip"
import { holdingCosts } from "./holding"
import { analyseKeep, refinanceMonth, type KeepResult } from "./keep"
import { negate, sum } from "./money"
import { refurbTotal } from "./refurb"
import type { TaxRules } from "./rules/schema"
import { calculateSdlt, type SdltResult } from "./sdlt"
import type {
  BuyBox,
  CalcProduct,
  DealInputs,
  Figure,
  Months,
  Pence,
  Warning,
} from "./types"
import { verdict, type Verdict } from "./verdict"

export type AnalysisContext = {
  purchaseProduct: CalcProduct | null
  refiProduct: CalcProduct | null
  rules: TaxRules
  buyBox: BuyBox
  /** Free buying power excluding this deal; omit to skip affordability. */
  freeBuyingPowerPence?: Pence | null
}

export type Affordability = {
  affordable: boolean
  shortfallPence: Pence
  freeBuyingPowerPence: Pence
}

export type DealAnalysis = {
  sdlt: SdltResult
  acquisitionCosts: Figure
  purchaseFinance: PurchaseFinance
  refurb: Figure
  flip: FlipResult
  keep: KeepResult
  /** Peak cash needed across both exits — what affordability is judged against. */
  cashRequired: Figure
  affordability: Affordability | null
  verdict: Verdict
  warnings: Warning[]
}

function cashInvested(
  key: string,
  months: Months,
  parts: {
    deposit: Figure
    sdlt: Figure
    acquisition: Figure
    fees: Figure
    refurb: Figure
  },
  inputs: DealInputs,
  finance: PurchaseFinance
): Figure {
  const holding = holdingCosts(
    inputs.holding,
    finance.monthlyCashPaymentPence,
    months,
    key
  )
  const children = [
    parts.deposit,
    parts.sdlt,
    parts.acquisition,
    parts.fees,
    parts.refurb,
    holding.figure,
  ].filter((c) => c.value !== 0)
  return {
    key: `${key}.cashInvested`,
    label: "Cash invested",
    value: sum(children.map((c) => c.value)),
    unit: "pence",
    formula:
      "Deposit + stamp duty + buying costs + lender fees + refurb + holding costs",
    children,
  }
}

/** The core analysis, without the sensitivity grid. Pure and deterministic. */
export function analyseCore(
  inputs: DealInputs,
  ctx: AnalysisContext
): DealAnalysis {
  const price = inputs.purchase.pricePence
  const sdlt = calculateSdlt(inputs.buyer, price, ctx.rules.sdlt)
  const acquisitionParts = [
    {
      key: "purchase.legal",
      label: "Legal",
      value: inputs.purchase.legalPence,
    },
    {
      key: "purchase.survey",
      label: "Survey",
      value: inputs.purchase.surveyPence,
    },
    {
      key: "purchase.sourcing",
      label: "Sourcing / buying agent",
      value: inputs.purchase.sourcingPence,
    },
    {
      key: "purchase.other",
      label: "Other",
      value: inputs.purchase.otherPence,
    },
  ]
  const acquisitionCosts: Figure = {
    key: "acquisitionCosts",
    label: "Buying costs",
    value: sum(acquisitionParts.map((p) => p.value)),
    unit: "pence",
    children: acquisitionParts
      .filter((p) => p.value > 0)
      .map((p) => ({ ...p, unit: "pence" as const, inputs: [p.key] })),
  }
  const finance = purchaseFinance(
    ctx.purchaseProduct,
    price,
    inputs.purchaseFinance.ltv
  )
  const refurb = refurbTotal(inputs.refurb)

  const parts = {
    deposit: {
      key: "deposit",
      label:
        finance.netAdvancePence > 0
          ? "Deposit (price − loan advance)"
          : "Purchase price (cash)",
      value: price - finance.netAdvancePence,
      unit: "pence" as const,
      inputs: ["purchase.price", "purchaseFinance.ltv"],
      children: [
        {
          key: "purchase.price",
          label: "Purchase price",
          value: price,
          unit: "pence" as const,
          inputs: ["purchase.price"],
        },
        negate(finance.figure),
      ],
    },
    sdlt: sdlt.figure,
    acquisition: acquisitionCosts,
    fees: {
      key: "lenderFees",
      label: "Lender fees paid in cash",
      value: finance.upfrontCashFeesPence,
      unit: "pence" as const,
      inputs: ["purchaseFinance.product"],
    },
    refurb: refurb.figure,
  }

  const flipMonths = inputs.refurb.months + inputs.flip.monthsToSell
  const flipInvested = cashInvested("flip", flipMonths, parts, inputs, finance)
  const flip = analyseFlip({
    inputs,
    months: flipMonths,
    redemption: redeemPurchaseFinance(finance, flipMonths),
    cashInvested: flipInvested,
    rules: ctx.rules,
  })

  const keepMonths = refinanceMonth(inputs.refurb.months, ctx.refiProduct)
  const keepInvested = cashInvested("keep", keepMonths, parts, inputs, finance)
  const keep = analyseKeep({
    inputs,
    refi: ctx.refiProduct,
    months: keepMonths,
    redemption: redeemPurchaseFinance(finance, keepMonths),
    cashInvested: keepInvested,
  })

  const cashRequired =
    keep.available && keepInvested.value > flipInvested.value
      ? keepInvested
      : flipInvested
  const affordability =
    ctx.freeBuyingPowerPence === undefined || ctx.freeBuyingPowerPence === null
      ? null
      : {
          freeBuyingPowerPence: ctx.freeBuyingPowerPence,
          shortfallPence: Math.max(
            0,
            cashRequired.value - ctx.freeBuyingPowerPence
          ),
          affordable: cashRequired.value <= ctx.freeBuyingPowerPence,
        }

  const warnings: Warning[] = [...(keep.available ? keep.warnings : [])]
  if (ctx.purchaseProduct?.type === "residential" && ctx.refiProduct) {
    warnings.push({
      code: "residential_keep",
      message:
        "Residential mortgages are for owner-occupation. Letting the property needs the lender's consent to let, or a buy-to-let product.",
      inputs: ["purchaseFinance.product"],
    })
  }
  const purchaseProduct = ctx.purchaseProduct
  if (
    purchaseProduct?.maxLtv != null &&
    inputs.purchaseFinance.ltv > purchaseProduct.maxLtv
  ) {
    warnings.push({
      code: "ltv_capped",
      message: `The lender's maximum LTV is ${+(purchaseProduct.maxLtv * 100).toFixed(1)}%, so the loan is capped there.`,
      inputs: ["purchaseFinance.ltv"],
    })
  }
  if (
    purchaseProduct?.type === "bridging" &&
    purchaseProduct.termMonths !== null
  ) {
    const longest = Math.max(flipMonths, keep.available ? keepMonths : 0)
    if (longest > purchaseProduct.termMonths) {
      warnings.push({
        code: "bridge_term",
        message: `The bridge term is ${purchaseProduct.termMonths} months but the plan needs ${longest}. You'd need an extension or an earlier exit.`,
        inputs: ["refurb.months", "flip.monthsToSell"],
      })
    }
  }
  if (affordability && !affordability.affordable) {
    warnings.push({
      code: "unaffordable",
      message: "This deal needs more cash than your free buying power.",
    })
  }

  return {
    sdlt,
    acquisitionCosts,
    purchaseFinance: finance,
    refurb: refurb.figure,
    flip,
    keep,
    cashRequired: {
      ...cashRequired,
      key: "cashRequired",
      label: "Total cash required",
    },
    affordability,
    verdict: verdict(flip, keep, ctx.buyBox),
    warnings,
  }
}
