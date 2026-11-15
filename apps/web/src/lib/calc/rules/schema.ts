import { z } from "zod"

/** Tax rules are data, not code: versioned by effective date, validated by these schemas. */

const pence = z.number().int().nonnegative()
const ratio = z.number().min(0).max(1)

export const sdltRulesSchema = z.object({
  /** Residential bands on the price; `toPence: null` = no upper limit. */
  bands: z
    .array(
      z.object({ fromPence: pence, toPence: pence.nullable(), rate: ratio })
    )
    .min(1),
  additionalDwellingSurcharge: ratio,
  /** Higher rates don't apply below this price. */
  additionalDwellingMinPricePence: pence,
  nonResidentSurcharge: ratio,
  corporateFlatRate: ratio,
  /** Flat rate applies to corporate purchases above this price (unless relief). */
  corporateFlatRateAbovePence: pence,
})

export const incomeTaxRulesSchema = z.object({
  personalAllowancePence: pence,
  /** Allowance reduces above this adjusted net income… */
  allowanceTaperThresholdPence: pence,
  /** …by this much per £1 over (0.5 = £1 per £2). */
  allowanceTaperRate: ratio,
  /** Bands on TAXABLE income (after allowance); `uptoPence: null` = top band. */
  bands: z
    .array(
      z.object({ name: z.string(), uptoPence: pence.nullable(), rate: ratio })
    )
    .min(1),
  class4Ni: z.object({
    lowerProfitsLimitPence: pence,
    upperProfitsLimitPence: pence,
    mainRate: ratio,
    upperRate: ratio,
  }),
})

export const cgtRulesSchema = z.object({
  annualExemptAmountPence: pence,
  basicRate: ratio,
  higherRate: ratio,
  /** Size of the basic-rate band on taxable income (shared with income tax). */
  basicRateBandPence: pence,
})

export const corpTaxRulesSchema = z.object({
  smallProfitsRate: ratio,
  mainRate: ratio,
  lowerLimitPence: pence,
  upperLimitPence: pence,
  marginalReliefFraction: ratio,
})

export const vatRulesSchema = z.object({ standardRate: ratio })

export const ruleKinds = [
  "sdlt",
  "income_tax",
  "cgt",
  "corp_tax",
  "vat",
] as const
export type RuleKind = (typeof ruleKinds)[number]

export const ruleSchemas = {
  sdlt: sdltRulesSchema,
  income_tax: incomeTaxRulesSchema,
  cgt: cgtRulesSchema,
  corp_tax: corpTaxRulesSchema,
  vat: vatRulesSchema,
} as const

export type SdltRules = z.infer<typeof sdltRulesSchema>
export type IncomeTaxRules = z.infer<typeof incomeTaxRulesSchema>
export type CgtRules = z.infer<typeof cgtRulesSchema>
export type CorpTaxRules = z.infer<typeof corpTaxRulesSchema>
export type VatRules = z.infer<typeof vatRulesSchema>

export type TaxRules = {
  sdlt: SdltRules
  incomeTax: IncomeTaxRules
  cgt: CgtRules
  corpTax: CorpTaxRules
  vat: VatRules
}

/** One stored, versioned rule set (mirrors the tax_rule_set table). */
export type RuleSetRecord = {
  kind: RuleKind
  effectiveFrom: string
  effectiveTo: string | null
  data: unknown
  sourceUrl: string | null
  verifiedAt: string | null
  /** Workspace-specific version (wins over a global row with the same effective date). */
  workspaceScoped?: boolean
}

export class MissingTaxRulesError extends Error {
  override name = "MissingTaxRulesError"
}

/** Picks the latest rule set of `kind` in force on `date` (ISO), and validates it. */
export function selectRuleSet<K extends RuleKind>(
  records: readonly RuleSetRecord[],
  kind: K,
  date: string
): z.infer<(typeof ruleSchemas)[K]> {
  const day = date.slice(0, 10)
  const candidates = records
    .filter(
      (r) =>
        r.kind === kind &&
        r.effectiveFrom <= day &&
        (r.effectiveTo === null || day <= r.effectiveTo)
    )
    .sort((a, b) =>
      a.effectiveFrom === b.effectiveFrom
        ? Number(b.workspaceScoped ?? false) -
          Number(a.workspaceScoped ?? false)
        : a.effectiveFrom < b.effectiveFrom
          ? 1
          : -1
    )
  const chosen = candidates[0]
  if (!chosen)
    throw new MissingTaxRulesError(`No ${kind} rules in force on ${day}`)
  return ruleSchemas[kind].parse(chosen.data) as z.infer<
    (typeof ruleSchemas)[K]
  >
}

export function selectTaxRules(
  records: readonly RuleSetRecord[],
  date: string
): TaxRules {
  return {
    sdlt: selectRuleSet(records, "sdlt", date),
    incomeTax: selectRuleSet(records, "income_tax", date),
    cgt: selectRuleSet(records, "cgt", date),
    corpTax: selectRuleSet(records, "corp_tax", date),
    vat: selectRuleSet(records, "vat", date),
  }
}
