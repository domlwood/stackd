/**
 * Calculation engine — public API. PURE: no I/O. The UI never does maths;
 * it renders DealAnalysis figures.
 */
import { analyseCore, type AnalysisContext, type DealAnalysis } from "./analyse"
import { sensitivity, type SensitivityRow } from "./sensitivity"
import type { DealInputs } from "./types"

export type FullDealAnalysis = DealAnalysis & { sensitivity: SensitivityRow[] }

export function analyseDeal(
  inputs: DealInputs,
  ctx: AnalysisContext
): FullDealAnalysis {
  const base = analyseCore(inputs, ctx)
  return { ...base, sensitivity: sensitivity(base, inputs, ctx) }
}

export type { AnalysisContext, DealAnalysis } from "./analyse"
export type { SensitivityRow } from "./sensitivity"
export type { FlipResult } from "./flip"
export type { KeepResult } from "./keep"
export type { Verdict, VerdictLevel } from "./verdict"
export { suggestGdv, type GdvSuggestion } from "./gdv"
export { quickRefurbEstimate, splitEstimate } from "./refurb"
export {
  selectTaxRules,
  type RuleSetRecord,
  type TaxRules,
} from "./rules/schema"
export { ENGLAND_RULES } from "./rules/england-2026"
export * from "./types"
