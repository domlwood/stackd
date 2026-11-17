"use client"

import { Switch } from "@workspace/ui/components/switch"

import { OptionSelect } from "@/components/blocks/option-select"
import { formatMoney } from "@/lib/format/money"
import { HOME_SITUATIONS, INVESTMENT_SITUATIONS } from "@/lib/calc/sdlt"
import type { BuyerSituation } from "@/lib/calc/types"
import { BUYER_SITUATION_OPTIONS } from "@/lib/inputs/registry"
import { useDeal } from "./deal-provider"

const optionsFor = (keys: readonly BuyerSituation[]) =>
  Object.fromEntries(
    keys.map((k) => [k, BUYER_SITUATION_OPTIONS[k]])
  ) as Record<BuyerSituation, string>
const HOME_OPTIONS = optionsFor(HOME_SITUATIONS)
const INVESTMENT_OPTIONS = optionsFor(INVESTMENT_SITUATIONS)

/**
 * "Buying as your home" (plan.liveIn) and the buying situation that sets
 * stamp duty (buyer.situation). Only a person can buy a home to live in, so
 * first-time buyer relief is only offered then; a company always pays company
 * rates. Both exits are always shown; this only changes buyer, stamp duty and
 * sale-tax assumptions.
 */
export function HomeToggle() {
  const { built, setInput } = useDeal()
  // Read the normalised inputs: a choice saved for the other mode shows as its equivalent.
  const company = built.resolved.values["buyer.entity"] === "ltd"
  const liveIn = built.ok
    ? built.inputs.plan.liveIn
    : built.resolved.values["plan.liveIn"] === true && !company
  const situation = built.ok
    ? built.inputs.buyer.situation
    : (built.resolved.values["buyer.situation"] as BuyerSituation)
  const sdlt = built.ok ? built.analysis.sdlt : null

  return (
    <section
      aria-label="How you're buying"
      className="flex flex-col gap-3 rounded-md border bg-card px-4 py-3"
    >
      <label
        htmlFor="plan-live-in"
        className="flex cursor-pointer items-start justify-between gap-4"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium">Buying as your home</span>
          <span className="text-xs text-muted-foreground">
            {company
              ? "Bought through a company, so it can't be your home: no first-time buyer relief, and the sale is taxed."
              : liveIn
                ? "Personal name and a residential mortgage. You live there through the refurb, so selling is tax-free as your main residence."
                : "Bought as an investment, so the sale is taxed and there's no first-time buyer relief."}
          </span>
        </span>
        <Switch
          id="plan-live-in"
          className="mt-0.5"
          checked={liveIn}
          disabled={company}
          onCheckedChange={(checked) => void setInput("plan.liveIn", checked)}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        {company ? null : (
          <>
            <label htmlFor="buyer-situation" className="text-xs font-medium">
              {liveIn ? "Your situation" : "Other property you own"}
            </label>
            <div className="sm:max-w-sm">
              <OptionSelect
                id="buyer-situation"
                value={situation}
                options={liveIn ? HOME_OPTIONS : INVESTMENT_OPTIONS}
                onValueChange={(next) => {
                  if (next !== situation) void setInput("buyer.situation", next)
                }}
              />
            </div>
          </>
        )}
        {sdlt ? (
          <p className="text-xs text-muted-foreground">
            Stamp duty {formatMoney(sdlt.totalPence)}
            {company
              ? " at company rates."
              : sdlt.basis === "first_time_buyer"
                ? " with first-time buyer relief."
                : sdlt.basis === "higher_rates"
                  ? sdlt.reclaimablePence > 0
                    ? `, including the surcharge. You can claim back ${formatMoney(sdlt.reclaimablePence)} if you sell your old home within 3 years.`
                    : ", including the 5% higher-rates surcharge."
                  : " at standard rates."}
          </p>
        ) : null}
      </div>
    </section>
  )
}
