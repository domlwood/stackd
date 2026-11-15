import { pct, roundPence } from "./money"
import type { CgtRules, CorpTaxRules, IncomeTaxRules } from "./rules/schema"
import type { Figure, Pence, TaxMode } from "./types"

export function personalAllowance(
  incomePence: Pence,
  rules: IncomeTaxRules
): Pence {
  const excess = Math.max(0, incomePence - rules.allowanceTaperThresholdPence)
  return Math.max(
    0,
    rules.personalAllowancePence - roundPence(excess * rules.allowanceTaperRate)
  )
}

/** Income tax on total income (allowance tapered), bands applied to taxable income. */
export function incomeTax(incomePence: Pence, rules: IncomeTaxRules): Pence {
  let remaining = Math.max(
    0,
    incomePence - personalAllowance(incomePence, rules)
  )
  let lower = 0
  let tax = 0
  for (const band of rules.bands) {
    const width =
      band.uptoPence === null
        ? remaining
        : Math.max(0, Math.min(remaining, band.uptoPence - lower))
    tax += width * band.rate
    remaining -= width
    lower = band.uptoPence ?? lower
    if (remaining <= 0) break
  }
  return roundPence(tax)
}

/** Class 4 NI on trading profit. */
export function class4Ni(
  profitPence: Pence,
  rules: IncomeTaxRules["class4Ni"]
): Pence {
  const main = Math.max(
    0,
    Math.min(profitPence, rules.upperProfitsLimitPence) -
      rules.lowerProfitsLimitPence
  )
  const upper = Math.max(0, profitPence - rules.upperProfitsLimitPence)
  return roundPence(main * rules.mainRate + upper * rules.upperRate)
}

/** Corporation tax with marginal relief: 25%·P − fraction·(upper − P) between the limits. */
export function corporationTax(profitPence: Pence, rules: CorpTaxRules): Pence {
  if (profitPence <= 0) return 0
  if (profitPence <= rules.lowerLimitPence)
    return pct(profitPence, rules.smallProfitsRate)
  if (profitPence >= rules.upperLimitPence)
    return pct(profitPence, rules.mainRate)
  return roundPence(
    profitPence * rules.mainRate -
      rules.marginalReliefFraction * (rules.upperLimitPence - profitPence)
  )
}

/** CGT on a gain stacked on other income: 18% in unused basic band, 24% above, after the annual exempt amount. */
export function capitalGainsTax(
  gainPence: Pence,
  otherIncomePence: Pence,
  cgt: CgtRules,
  income: IncomeTaxRules
): Pence {
  const taxableGain = Math.max(0, gainPence - cgt.annualExemptAmountPence)
  const taxableIncome = Math.max(
    0,
    otherIncomePence - personalAllowance(otherIncomePence, income)
  )
  const basicSpace = Math.max(0, cgt.basicRateBandPence - taxableIncome)
  const atBasic = Math.min(taxableGain, basicSpace)
  return roundPence(
    atBasic * cgt.basicRate + (taxableGain - atBasic) * cgt.higherRate
  )
}

export const TAX_MODE_LABELS: Record<TaxMode, string> = {
  income_tax: "Income tax + Class 4 NI (trading)",
  cgt: "Capital gains tax",
  corp_tax: "Corporation tax",
}

/** Estimated tax on a flip profit. Always an estimate: depends on the rest of your tax position. */
export function flipTax(
  profitPence: Pence,
  mode: TaxMode,
  otherIncomePence: Pence,
  rules: { incomeTax: IncomeTaxRules; cgt: CgtRules; corpTax: CorpTaxRules }
): { taxPence: Pence; figure: Figure } {
  let taxPence = 0
  let children: Figure[] = []
  if (profitPence > 0) {
    if (mode === "income_tax") {
      const it =
        incomeTax(otherIncomePence + profitPence, rules.incomeTax) -
        incomeTax(otherIncomePence, rules.incomeTax)
      const ni = class4Ni(profitPence, rules.incomeTax.class4Ni)
      taxPence = it + ni
      children = [
        {
          key: "flip.tax.incomeTax",
          label: "Income tax on the profit",
          value: it,
          unit: "pence",
          inputs: ["flip.otherIncome"],
        },
        {
          key: "flip.tax.ni",
          label: "Class 4 National Insurance",
          value: ni,
          unit: "pence",
        },
      ]
    } else if (mode === "cgt") {
      taxPence = capitalGainsTax(
        profitPence,
        otherIncomePence,
        rules.cgt,
        rules.incomeTax
      )
    } else {
      taxPence = corporationTax(profitPence, rules.corpTax)
    }
  }
  return {
    taxPence,
    figure: {
      key: "flip.tax",
      label: "Tax (estimate)",
      value: taxPence,
      unit: "pence",
      formula: TAX_MODE_LABELS[mode],
      inputs: ["flip.taxMode", "flip.otherIncome"],
      note: "Estimate only. Your actual liability depends on your full tax position; check with an accountant.",
      children,
    },
  }
}
