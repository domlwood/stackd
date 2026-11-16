/**
 * VerdictBadge — deal verdict against the buy box. Colour carries meaning only.
 * Props: level (VerdictLevel | null), className?
 * Usage: <VerdictBadge level={analysis.verdict.level} />
 */
import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleMinusIcon,
  CircleXIcon,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

import type { VerdictLevel } from "@/lib/calc/verdict"

export type { VerdictLevel }

export const VERDICT_LABELS: Record<VerdictLevel, string> = {
  stacks: "Stacks",
  marginal: "Marginal",
  doesnt_stack: "Doesn't stack",
  needs_details: "Needs details",
}

const STYLES: Record<VerdictLevel, { className: string; icon: LucideIcon }> = {
  stacks: {
    className: "border-positive/40 bg-positive/10 text-positive-foreground",
    icon: CircleCheckIcon,
  },
  marginal: {
    className: "border-warning/50 bg-warning/10 text-warning-foreground",
    icon: CircleMinusIcon,
  },
  doesnt_stack: {
    className: "border-negative/40 bg-negative/10 text-negative-foreground",
    icon: CircleXIcon,
  },
  // Neutral, not a judgement: the deal just isn't fully specified yet.
  needs_details: {
    className: "border-border bg-muted text-muted-foreground",
    icon: CircleDashedIcon,
  },
}

export function VerdictBadge({
  level,
  className,
}: {
  level: VerdictLevel | null
  className?: string
}) {
  if (!level) return <Badge variant="outline">No verdict</Badge>
  const { className: tone, icon: Icon } = STYLES[level]
  return (
    <Badge variant="outline" className={cn(tone, className)}>
      <Icon aria-hidden />
      {VERDICT_LABELS[level]}
    </Badge>
  )
}
