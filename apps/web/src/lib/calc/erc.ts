import { pct } from "./money"
import type { CalcProduct, Months, Pence, Ratio } from "./types"

/** ERC % in force at `monthsSinceStart` (bands are [from, to)); 0 outside the schedule. */
export function ercRateAt(
  bands: CalcProduct["ercBands"],
  monthsSinceStart: Months
): Ratio {
  const band = bands.find(
    (b) => b.fromMonth <= monthsSinceStart && monthsSinceStart < b.toMonth
  )
  return band?.pct ?? 0
}

/** ERC owed when redeeming `balancePence` at month `m`. */
export function ercAt(
  product: CalcProduct | null,
  balancePence: Pence,
  monthsSinceStart: Months
): { rate: Ratio; pence: Pence } {
  if (!product) return { rate: 0, pence: 0 }
  const rate = ercRateAt(product.ercBands, monthsSinceStart)
  return { rate, pence: pct(balancePence, rate) }
}
