import { StatCard } from "@/components/blocks/stat-card"
import { formatMoney } from "@/lib/format/money"
import type { BuyingPower } from "../rules"

/** Free buying power first (it's the number that matters), then its inputs. */
export function BuyingPowerSummary({
  power,
  potCount,
}: {
  power: BuyingPower
  potCount: number
}) {
  const activeDeals = power.commitments.length
  return (
    <section
      aria-label="Buying power"
      className="grid grid-cols-2 gap-3 lg:grid-cols-3"
    >
      <div className="col-span-2 lg:col-span-1">
        <StatCard
          label="Free buying power"
          value={formatMoney(power.freePence)}
          tone={power.freePence < 0 ? "negative" : "default"}
          hint={
            power.freePence < 0
              ? "Over-committed: active deals need more cash than you have."
              : "Available for new deals"
          }
        />
      </div>
      <StatCard
        label="In fund pots"
        value={formatMoney(power.totalPotsPence)}
        hint={`${potCount} pot${potCount === 1 ? "" : "s"}`}
      />
      <StatCard
        label="Committed"
        value={formatMoney(power.committedPence)}
        hint={
          activeDeals === 0
            ? "No deals at offer or accepted"
            : `${activeDeals} active deal${activeDeals === 1 ? "" : "s"}`
        }
      />
    </section>
  )
}
