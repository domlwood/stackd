"use client"

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import type { Strategy } from "@/lib/calc/types"
import { STRATEGY_DESCRIPTIONS, STRATEGY_OPTIONS } from "@/lib/inputs/registry"
import { useDeal } from "./deal-provider"

const STRATEGIES = Object.keys(STRATEGY_OPTIONS) as Strategy[]

/** Which exit the analysis is judged on. Saved as the deal's `plan.strategy` input. */
export function StrategyPicker() {
  const { built, setInput } = useDeal()
  const current = built.resolved.values["plan.strategy"] as Strategy
  return (
    <section aria-labelledby="strategy-heading" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="strategy-heading" className="text-sm font-medium">
          Plan
        </h3>
        <ToggleGroup
          aria-labelledby="strategy-heading"
          variant="outline"
          size="sm"
          value={[current]}
          onValueChange={(v: string[]) => {
            const next = v[0] as Strategy | undefined
            if (next && next !== current) void setInput("plan.strategy", next)
          }}
        >
          {STRATEGIES.map((s) => (
            <ToggleGroupItem key={s} value={s}>
              {STRATEGY_OPTIONS[s]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <p className="text-xs text-muted-foreground">
        {STRATEGY_DESCRIPTIONS[current]}
      </p>
    </section>
  )
}
