"use client"

import { CircleAlertIcon, CircleCheckIcon, InfinityIcon } from "lucide-react"

import { Card } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

import { VerdictBadge } from "@/components/blocks/verdict-badge"
import { formatMoney } from "@/lib/format/money"
import { formatPercent } from "@/lib/format/percent"
import { useDeal } from "./deal-provider"

function Metric({
  label,
  value,
  tone,
  sub,
}: {
  label: string
  value: string
  tone?: "positive" | "negative" | "warning"
  sub?: string
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "truncate text-base font-semibold tabular-nums sm:text-lg",
          tone === "positive" && "text-positive-foreground",
          tone === "negative" && "text-negative-foreground",
          tone === "warning" && "text-warning-foreground"
        )}
      >
        {value}
      </div>
      {sub ? (
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      ) : null}
    </div>
  )
}

/** Header strip: verdict, cash, affordability, and Flip vs Keep side by side. */
export function MetricStrip() {
  const { built } = useDeal()
  if (!built.ok) {
    return (
      <Card className="flex-row items-center gap-2 px-4 text-sm text-warning-foreground">
        <CircleAlertIcon className="size-4 shrink-0" aria-hidden />
        {built.message}
      </Card>
    )
  }
  const { analysis } = built
  const { flip, keep, affordability, verdict } = analysis

  return (
    <section aria-label="Deal summary" className="flex flex-col gap-3">
      <Card size="sm" className="gap-3 px-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <VerdictBadge level={verdict.level} className="h-7 px-2.5 text-sm" />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            {verdict.reasons[0]}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Total cash required"
            value={formatMoney(analysis.cashRequired.value)}
          />
          {affordability ? (
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Affordable</div>
              {affordability.affordable ? (
                <div className="flex items-center gap-1.5 text-base font-semibold text-positive-foreground sm:text-lg">
                  <CircleCheckIcon className="size-4" aria-hidden /> Yes
                </div>
              ) : (
                <div className="text-base font-semibold text-negative-foreground tabular-nums sm:text-lg">
                  Short by {formatMoney(affordability.shortfallPence)}
                </div>
              )}
              <div className="truncate text-xs text-muted-foreground">
                Free buying power{" "}
                {formatMoney(affordability.freeBuyingPowerPence)}
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card size="sm" className="gap-2 px-3 sm:px-4">
          <div className="text-sm font-medium">Flip</div>
          <Metric
            label="Profit"
            value={formatMoney(flip.profitPence)}
            tone={flip.profitPence < 0 ? "negative" : undefined}
            sub={`${formatMoney(flip.profitAfterTaxPence)} after tax (est.)`}
          />
          <div className="grid grid-cols-2 gap-2">
            <Metric label="ROI" value={formatPercent(flip.roi, 1)} />
            <Metric label="Timeline" value={`${flip.months} mo`} />
          </div>
        </Card>
        <Card size="sm" className="gap-2 px-3 sm:px-4">
          <div className="text-sm font-medium">Keep</div>
          {keep.available ? (
            <>
              <Metric
                label="Money left in"
                value={
                  keep.moneyLeftInPence <= 0
                    ? "£0"
                    : formatMoney(keep.moneyLeftInPence)
                }
                tone={keep.moneyLeftInPence <= 0 ? "positive" : undefined}
                sub={
                  keep.moneyLeftInPence < 0
                    ? `${formatMoney(-keep.moneyLeftInPence)} pulled out`
                    : `Refinance at month ${keep.months}`
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <Metric
                  label="Cashflow"
                  value={`${formatMoney(keep.monthlyCashflowPence)}/m`}
                  tone={keep.monthlyCashflowPence < 0 ? "negative" : undefined}
                />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">
                    ROCE · ICR
                  </div>
                  <div className="flex items-center gap-1.5 text-base font-semibold tabular-nums sm:text-lg">
                    {Number.isFinite(keep.roce) ? (
                      formatPercent(keep.roce, 1)
                    ) : (
                      <InfinityIcon className="size-5" aria-label="Infinite" />
                    )}
                    <span
                      className={cn(
                        "text-xs font-medium",
                        keep.icrPass
                          ? "text-positive-foreground"
                          : "text-negative-foreground"
                      )}
                    >
                      {keep.icrPass ? "ICR ✓" : "ICR ✗"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{keep.reason}</p>
          )}
        </Card>
      </div>
    </section>
  )
}
