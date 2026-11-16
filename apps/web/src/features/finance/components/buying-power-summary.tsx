import { StatCard } from "@/components/blocks/stat-card"
import { formatMoney } from "@/lib/format/money"
import type { BuyingPower } from "../rules"

/**
 * Buying power is the total in your fund pots: each deal's affordability is
 * judged against it. Nothing is held back per deal, so update your pots when
 * you buy.
 */
export function BuyingPowerSummary({
  power,
  potCount,
}: {
  power: BuyingPower
  potCount: number
}) {
  return (
    <section aria-label="Buying power">
      <StatCard
        label="Buying power"
        value={formatMoney(power.totalPotsPence)}
        hint={`Across ${potCount} fund pot${potCount === 1 ? "" : "s"}. Update them when you buy.`}
      />
    </section>
  )
}
