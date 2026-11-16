import { ZodError } from "zod"

import { analyseDeal, type FullDealAnalysis } from "@/lib/calc"
import { analyseCore } from "@/lib/calc/analyse"
import {
  MissingTaxRulesError,
  selectTaxRules,
  type RuleSetRecord,
} from "@/lib/calc/rules/schema"
import type { CalcProduct, DealInputs } from "@/lib/calc/types"
import type { DefaultsSource } from "@/lib/inputs/registry"
import {
  resolveInputs,
  type ResolvedInputs,
  type StoredInput,
  type View,
} from "@/lib/inputs/resolve"
import { toDealInputs } from "@/lib/inputs/to-deal-inputs"
import type { WorkspaceSettings } from "@/features/settings/schemas"
import type { Deal, RefurbLineRecord } from "@/features/deals/types"

export type BuiltAnalysis =
  | {
      ok: true
      resolved: ResolvedInputs
      inputs: DealInputs
      analysis: FullDealAnalysis
      purchaseProduct: CalcProduct | null
      refiProduct: CalcProduct | null
    }
  | { ok: false; resolved: ResolvedInputs; message: string }

export function defaultsSourceFor(
  deal: Pick<Deal, "askingPricePence">,
  settings: WorkspaceSettings,
  today: string,
  suggestedGdvPence: number | null = null
): DefaultsSource {
  return {
    buyerEntity: settings.buyerEntity,
    today,
    deal: { askingPricePence: deal.askingPricePence, suggestedGdvPence },
    defaults: settings.defaults,
  }
}

/**
 * Resolve inputs for a view and run the engine. Pure: used on the client for
 * instant recalculation and on the server for the pipeline and buying power.
 */
export function buildAnalysis(args: {
  deal: Pick<Deal, "askingPricePence">
  stored: readonly StoredInput[]
  refurbLines: readonly RefurbLineRecord[]
  products: readonly CalcProduct[]
  ruleRecords: readonly RuleSetRecord[]
  settings: WorkspaceSettings
  today: string
  view: View
  freeBuyingPowerPence?: number | null
  /**
   * Run the 8-scenario sensitivity grid (default true). Server-side summaries
   * skip it: it multiplies engine work ~8x and only the deal page shows it.
   */
  withSensitivity?: boolean
}): BuiltAnalysis {
  const resolved = resolveInputs({
    stored: args.stored,
    defaults: defaultsSourceFor(args.deal, args.settings, args.today),
    view: args.view,
    refurbItemIds: args.refurbLines.map((l) => l.id),
  })
  const { inputs, purchaseProductId, refiProductId } = toDealInputs(
    resolved,
    args.refurbLines
  )
  const byId = (id: string | null) =>
    id ? (args.products.find((p) => p.id === id) ?? null) : null
  const purchaseProduct = byId(purchaseProductId)
  const refiProduct = byId(refiProductId)

  try {
    const rules = selectTaxRules(
      args.ruleRecords,
      inputs.purchase.completionDate
    )
    const ctx = {
      purchaseProduct,
      refiProduct,
      rules,
      buyBox: args.settings.buyBox,
      freeBuyingPowerPence: args.freeBuyingPowerPence,
    }
    const analysis: FullDealAnalysis =
      args.withSensitivity === false
        ? { ...analyseCore(inputs, ctx), sensitivity: [] }
        : analyseDeal(inputs, ctx)
    return {
      ok: true,
      resolved,
      inputs,
      analysis,
      purchaseProduct,
      refiProduct,
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        resolved,
        message:
          "The stored tax rules for this date are incomplete, so we can't run the numbers. Check the tax rules in Settings.",
      }
    }
    if (error instanceof MissingTaxRulesError) {
      return {
        ok: false,
        resolved,
        message: `${error.message}. Add tax rules for that date in Settings, or change the expected completion date.`,
      }
    }
    throw error
  }
}

/** Compact Agreed-view summary for pipeline cards and tables. */
export type DealSummary = {
  verdict: "stacks" | "marginal" | "doesnt_stack" | null
  cashRequiredPence: number | null
  flipProfitPence: number | null
  flipRoi: number | null
  moneyLeftInPence: number | null
  monthlyCashflowPence: number | null
  affordable: boolean | null
  shortfallPence: number | null
  error: string | null
}

export function summarise(built: BuiltAnalysis): DealSummary {
  if (!built.ok) {
    return {
      verdict: null,
      cashRequiredPence: null,
      flipProfitPence: null,
      flipRoi: null,
      moneyLeftInPence: null,
      monthlyCashflowPence: null,
      affordable: null,
      shortfallPence: null,
      error: built.message,
    }
  }
  const { analysis } = built
  const keep = analysis.keep.available ? analysis.keep : null
  return {
    verdict: analysis.verdict.level,
    cashRequiredPence: analysis.cashRequired.value,
    flipProfitPence: analysis.flip.profitPence,
    flipRoi: analysis.flip.roi,
    moneyLeftInPence: keep?.moneyLeftInPence ?? null,
    monthlyCashflowPence: keep?.monthlyCashflowPence ?? null,
    affordable: analysis.affordability?.affordable ?? null,
    shortfallPence: analysis.affordability?.shortfallPence ?? null,
    error: null,
  }
}
