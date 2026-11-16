import { analyseCore, type AnalysisContext, type DealAnalysis } from "./analyse"
import { roundPence } from "./money"
import type { CalcProduct, DealInputs, Pence } from "./types"
import type { VerdictLevel } from "./verdict"

export type Scenario = {
  key: string
  label: string
  apply: (
    inputs: DealInputs,
    ctx: AnalysisContext
  ) => { inputs: DealInputs; ctx: AnalysisContext }
}

const MONTHS_PER_YEAR = 12

const scaleGdv =
  (factor: number): Scenario["apply"] =>
  (inputs, ctx) => ({
    inputs: {
      ...inputs,
      exit: { gdvPence: roundPence(inputs.exit.gdvPence * factor) },
    },
    ctx,
  })

const scaleRefurb =
  (factor: number): Scenario["apply"] =>
  (inputs, ctx) => ({
    inputs: {
      ...inputs,
      refurb: {
        ...inputs.refurb,
        items: inputs.refurb.items.map((i) => ({
          ...i,
          costPence: roundPence(i.costPence * factor),
        })),
      },
    },
    ctx,
  })

const delay =
  (months: number): Scenario["apply"] =>
  (inputs, ctx) => ({
    inputs: {
      ...inputs,
      refurb: { ...inputs.refurb, months: inputs.refurb.months + months },
    },
    ctx,
  })

function bumpRate(
  product: CalcProduct | null,
  delta: number
): CalcProduct | null {
  if (!product) return null
  return {
    ...product,
    rate: product.rate === null ? null : product.rate + delta,
    monthlyRate:
      product.monthlyRate === null
        ? null
        : product.monthlyRate + delta / MONTHS_PER_YEAR,
  }
}

export const SCENARIOS: readonly Scenario[] = [
  { key: "gdv-5", label: "GDV −5%", apply: scaleGdv(0.95) },
  { key: "gdv-10", label: "GDV −10%", apply: scaleGdv(0.9) },
  { key: "refurb+10", label: "Refurb +10%", apply: scaleRefurb(1.1) },
  { key: "refurb+20", label: "Refurb +20%", apply: scaleRefurb(1.2) },
  { key: "time+3", label: "Timeline +3 months", apply: delay(3) },
  { key: "time+6", label: "Timeline +6 months", apply: delay(6) },
  {
    key: "rate+1",
    label: "Interest rates +1%",
    apply: (inputs, ctx) => ({
      inputs,
      ctx: {
        ...ctx,
        purchaseProduct: bumpRate(ctx.purchaseProduct, 0.01),
        refiProduct: bumpRate(ctx.refiProduct, 0.01),
      },
    }),
  },
]

export type SensitivityRow = {
  key: string
  label: string
  flipProfitPence: Pence
  flipProfitDeltaPence: Pence
  moneyLeftInPence: Pence | null
  moneyLeftInDeltaPence: Pence | null
  cashflowPence: Pence | null
  cashflowDeltaPence: Pence | null
  verdict: VerdictLevel
}

export function sensitivity(
  base: DealAnalysis,
  inputs: DealInputs,
  ctx: AnalysisContext,
  scenarios: readonly Scenario[] = SCENARIOS
): SensitivityRow[] {
  return scenarios.map((scenario) => {
    const adjusted = scenario.apply(inputs, ctx)
    const result = analyseCore(adjusted.inputs, adjusted.ctx)
    const keep = result.keep.available ? result.keep : null
    const baseKeep = base.keep.available ? base.keep : null
    return {
      key: scenario.key,
      label: scenario.label,
      flipProfitPence: result.flip.profitPence,
      flipProfitDeltaPence: result.flip.profitPence - base.flip.profitPence,
      moneyLeftInPence: keep?.moneyLeftInPence ?? null,
      moneyLeftInDeltaPence:
        keep && baseKeep
          ? keep.moneyLeftInPence - baseKeep.moneyLeftInPence
          : null,
      cashflowPence: keep?.monthlyCashflowPence ?? null,
      cashflowDeltaPence:
        keep && baseKeep
          ? keep.monthlyCashflowPence - baseKeep.monthlyCashflowPence
          : null,
      verdict: result.verdict.level,
    }
  })
}
