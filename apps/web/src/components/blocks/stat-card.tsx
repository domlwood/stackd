/**
 * StatCard — KPI tile, adapted from shadcn `dashboard-01` SectionCards.
 *
 * Props:
 *  - label: what the number is
 *  - value: preformatted headline (e.g. "£245,000")
 *  - hint?: supporting line under the value
 *  - tone?: "default" | "positive" | "negative" | "warning" (meaning-only colour on the value)
 *
 * Usage: <StatCard label="Free buying power" value={formatMoney(free)} tone={free < 0 ? "negative" : "default"} />
 */
import type { ReactNode } from "react"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

export type StatTone = "default" | "positive" | "negative" | "warning"

const TONE_CLASS: Record<StatTone, string> = {
  default: "",
  positive: "text-positive-foreground",
  negative: "text-negative-foreground",
  warning: "text-warning-foreground",
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string
  hint?: ReactNode
  tone?: StatTone
}) {
  return (
    <Card size="sm" className="@container/card">
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            "text-xl font-semibold tabular-nums group-data-[size=sm]/card:text-xl @[250px]/card:group-data-[size=sm]/card:text-2xl",
            TONE_CLASS[tone]
          )}
        >
          {value}
        </CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
    </Card>
  )
}
