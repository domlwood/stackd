import type { Redemption } from "./finance"
import { MONTHS_PER_YEAR, negate, pct, ratioOf } from "./money"
import type { TaxRules } from "./rules/schema"
import { flipTax } from "./tax"
import type { DealInputs, Figure, Months, Pence, Ratio } from "./types"

export type FlipResult = {
  months: Months
  salePricePence: Pence
  saleCostsPence: Pence
  redemptionPence: Pence
  netProceedsPence: Pence
  cashInvestedPence: Pence
  profitPence: Pence
  roi: Ratio
  annualisedRoi: Ratio
  taxPence: Pence
  profitAfterTaxPence: Pence
  figures: {
    profit: Figure
    roi: Figure
    tax: Figure
    saleCosts: Figure
    cashInvested: Figure
  }
}

export function saleCosts(
  gdvPence: Pence,
  flip: DealInputs["flip"],
  vatRate: Ratio
): { totalPence: Pence; figure: Figure } {
  const agentPence = pct(
    gdvPence,
    flip.agentFee * (flip.agentFeeVat ? 1 + vatRate : 1)
  )
  const totalPence = agentPence + flip.saleLegalPence
  return {
    totalPence,
    figure: {
      key: "flip.saleCosts",
      label: "Sale costs",
      value: totalPence,
      unit: "pence",
      children: [
        {
          key: "flip.saleCosts.agent",
          label: `Agent fee (${+(flip.agentFee * 100).toFixed(2)}%${flip.agentFeeVat ? " + VAT" : ""})`,
          value: agentPence,
          unit: "pence",
          inputs: ["flip.agentFee", "flip.agentFeeVat"],
        },
        {
          key: "flip.saleCosts.legal",
          label: "Sale legal fees",
          value: flip.saleLegalPence,
          unit: "pence",
          inputs: ["flip.saleLegal"],
        },
      ],
    },
  }
}

/**
 * Flip: sell at GDV after refurb + marketing.
 *   Net proceeds = GDV − sale costs − loan redemption (incl. exit fee + ERC)
 *   Profit       = net proceeds − total cash invested
 *   ROI          = profit / cash invested; annualised = ROI × 12 / months
 */
export function analyseFlip(args: {
  inputs: DealInputs
  months: Months
  redemption: Redemption
  cashInvested: Figure
  rules: TaxRules
}): FlipResult {
  const { inputs, months, redemption, cashInvested, rules } = args
  const gdv = inputs.exit.gdvPence
  const costs = saleCosts(gdv, inputs.flip, rules.vat.standardRate)
  const netProceedsPence = gdv - costs.totalPence - redemption.totalPence
  const profitPence = netProceedsPence - cashInvested.value
  const roi = ratioOf(profitPence, cashInvested.value, 0)
  const annualisedRoi = months > 0 ? (roi * MONTHS_PER_YEAR) / months : roi
  const tax = flipTax(
    profitPence,
    inputs.flip.taxMode,
    inputs.flip.otherIncomePence,
    rules
  )

  const profit: Figure = {
    key: "flip.profit",
    label: "Flip profit (before tax)",
    value: profitPence,
    unit: "pence",
    formula: "Sale price − sale costs − loan redemption − cash invested",
    children: [
      {
        key: "flip.salePrice",
        label: "Sale price (GDV)",
        value: gdv,
        unit: "pence",
        inputs: ["exit.gdv"],
      },
      negate(costs.figure),
      negate(redemption.figure),
      negate(cashInvested),
    ],
  }

  return {
    months,
    salePricePence: gdv,
    saleCostsPence: costs.totalPence,
    redemptionPence: redemption.totalPence,
    netProceedsPence,
    cashInvestedPence: cashInvested.value,
    profitPence,
    roi,
    annualisedRoi,
    taxPence: tax.taxPence,
    profitAfterTaxPence: profitPence - tax.taxPence,
    figures: {
      profit,
      roi: {
        key: "flip.roi",
        label: "ROI",
        value: roi,
        unit: "ratio",
        formula: "Profit ÷ cash invested",
        children: [profit, cashInvested],
      },
      tax: tax.figure,
      saleCosts: costs.figure,
      cashInvested,
    },
  }
}
