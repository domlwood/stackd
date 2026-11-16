import { roundPence } from "./money"
import { SQFT_PER_SQM } from "./refurb"
import type { Pence } from "./types"

export type CompForGdv = { soldPricePence: Pence; floorAreaSqm: number | null }

export type GdvSuggestion = {
  count: number
  medianPence: Pence | null
  minPence: Pence | null
  maxPence: Pence | null
  q1Pence: Pence | null
  q3Pence: Pence | null
  medianPencePerSqft: Pence | null
  comparablesWithArea: number
  suggestedPence: Pence | null
  basis: "price_per_sqft" | "median_price" | "none"
}

export const MIN_COMPS_FOR_SQFT = 3

function quantile(sorted: readonly number[], q: number): number {
  const position = (sorted.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  const a = sorted[lower] ?? 0
  const b = sorted[upper] ?? a
  return a + (b - a) * (position - lower)
}

/**
 * Suggested GDV from included comps: median £/sq ft × subject area when the
 * subject area is known and ≥ 3 comps have an area; otherwise median price.
 */
export function suggestGdv(
  comps: readonly CompForGdv[],
  subjectFloorAreaSqm: number | null
): GdvSuggestion {
  const prices = comps.map((c) => c.soldPricePence).sort((a, b) => a - b)
  const withArea = comps.filter(
    (c): c is { soldPricePence: Pence; floorAreaSqm: number } =>
      (c.floorAreaSqm ?? 0) > 0
  )
  const perSqft = withArea
    .map((c) => c.soldPricePence / (c.floorAreaSqm * SQFT_PER_SQM))
    .sort((a, b) => a - b)

  if (prices.length === 0) {
    return {
      count: 0,
      medianPence: null,
      minPence: null,
      maxPence: null,
      q1Pence: null,
      q3Pence: null,
      medianPencePerSqft: null,
      comparablesWithArea: 0,
      suggestedPence: null,
      basis: "none",
    }
  }

  const medianPence = roundPence(quantile(prices, 0.5))
  const medianPencePerSqft =
    perSqft.length > 0 ? roundPence(quantile(perSqft, 0.5)) : null
  const useSqft =
    subjectFloorAreaSqm !== null &&
    subjectFloorAreaSqm > 0 &&
    perSqft.length >= MIN_COMPS_FOR_SQFT &&
    medianPencePerSqft !== null

  return {
    count: prices.length,
    medianPence,
    minPence: prices[0] ?? null,
    maxPence: prices.at(-1) ?? null,
    q1Pence: roundPence(quantile(prices, 0.25)),
    q3Pence: roundPence(quantile(prices, 0.75)),
    medianPencePerSqft,
    comparablesWithArea: withArea.length,
    suggestedPence: useSqft
      ? roundPence(
          (medianPencePerSqft ?? 0) * (subjectFloorAreaSqm ?? 0) * SQFT_PER_SQM
        )
      : medianPence,
    basis: useSqft ? "price_per_sqft" : "median_price",
  }
}
