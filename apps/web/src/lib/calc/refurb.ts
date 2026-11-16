import { pct, roundPence, sum } from "./money"
import type { DealInputs, Figure, Pence, Ratio } from "./types"

export function refurbTotal(refurb: DealInputs["refurb"]): {
  totalPence: Pence
  figure: Figure
} {
  // Line items, once added, replace the single budget figure.
  const useItems = refurb.items.length > 0
  const itemsPence = useItems
    ? sum(refurb.items.map((i) => i.costPence))
    : refurb.budgetPence
  const contingencyPence = pct(itemsPence, refurb.contingency)
  const totalPence = itemsPence + contingencyPence
  return {
    totalPence,
    figure: {
      key: "refurb",
      label: "Refurb",
      value: totalPence,
      unit: "pence",
      formula: useItems
        ? "Σ line items × (1 + contingency)"
        : "Refurb budget × (1 + contingency)",
      inputs: useItems
        ? ["refurb.contingency"]
        : ["refurb.budget", "refurb.contingency"],
      children: [
        ...(useItems
          ? []
          : [
              {
                key: "refurb.budget",
                label: "Refurb budget",
                value: refurb.budgetPence,
                unit: "pence" as const,
                inputs: ["refurb.budget"],
              },
            ]),
        ...refurb.items.map((item) => ({
          key: `refurb.item.${item.id}`,
          label: item.description
            ? `${item.category}: ${item.description}`
            : item.category,
          value: item.costPence,
          unit: "pence" as const,
          inputs: [`refurb_item:${item.id}.cost`],
        })),
        {
          key: "refurb.contingency",
          label: `Contingency (${+(refurb.contingency * 100).toFixed(1)}%)`,
          value: contingencyPence,
          unit: "pence" as const,
          inputs: ["refurb.contingency"],
        },
      ],
    },
  }
}

export const SQFT_PER_SQM = 10.7639

/** Quick estimate: floor area (sq ft) × £/sq ft for the chosen condition. */
export function quickRefurbEstimate(
  floorAreaSqm: number,
  ratePencePerSqft: Pence
): Pence {
  return roundPence(floorAreaSqm * SQFT_PER_SQM * ratePencePerSqft)
}

/**
 * Splits an estimate across categories by weight, in whole pence, so the parts
 * sum exactly to the total (largest-remainder allocation).
 */
export function splitEstimate(
  totalPence: Pence,
  weights: readonly { category: string; weight: Ratio }[]
): { category: string; costPence: Pence }[] {
  const weightSum = sum(weights.map((w) => w.weight))
  if (weightSum <= 0 || weights.length === 0) return []
  const raw = weights.map((w) => (totalPence * w.weight) / weightSum)
  const floored = raw.map(Math.floor)
  let remainder = totalPence - sum(floored)
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac)
  for (const { index } of order) {
    if (remainder <= 0) break
    floored[index] = (floored[index] ?? 0) + 1
    remainder -= 1
  }
  return weights.map((w, index) => ({
    category: w.category,
    costPence: floored[index] ?? 0,
  }))
}
