import type { Comparable, DealNote } from "./types"

export const SQFT_PER_SQM = 10.7639

export type CompSummary = {
  /** Which comparables the figures use: sold prices when there are any. */
  basis: "sold" | "listed"
  count: number
  medianPricePence: number
  lowPricePence: number
  highPricePence: number
  /** Median £ per sq ft, from comparables with a floor area. */
  medianPerSqftPence: number | null
  /** That rate × this property's floor area. */
  impliedValuePence: number | null
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[mid]!
    : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
}

/**
 * What the comparables say the property is worth. Sold prices are evidence;
 * asking prices are only used when nothing has sold.
 */
export function summariseComps(
  notes: readonly DealNote[],
  subjectFloorAreaSqm: number | null
): CompSummary | null {
  const comps = notes.flatMap((n) => (n.comp ? [n.comp] : []))
  const sold = comps.filter((c) => c.status === "sold")
  const basis = sold.length > 0 ? "sold" : "listed"
  const used: Comparable[] = sold.length > 0 ? sold : comps
  if (used.length === 0) return null

  const prices = used.map((c) => c.pricePence)
  const rates = used
    .filter((c) => c.floorAreaSqm)
    .map((c) => c.pricePence / (c.floorAreaSqm! * SQFT_PER_SQM))
  const medianPerSqftPence = rates.length ? Math.round(median(rates)) : null
  return {
    basis,
    count: used.length,
    medianPricePence: median(prices),
    lowPricePence: Math.min(...prices),
    highPricePence: Math.max(...prices),
    medianPerSqftPence,
    impliedValuePence:
      medianPerSqftPence !== null && subjectFloorAreaSqm
        ? Math.round(
            (medianPerSqftPence * subjectFloorAreaSqm * SQFT_PER_SQM) / 100_000
          ) * 100_000
        : null,
  }
}
