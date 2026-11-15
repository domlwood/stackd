import { ClockAlertIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"

import type { Staleness } from "../rules"

export function StaleBadge({ staleness }: { staleness: Staleness }) {
  if (!staleness.stale) return null
  return (
    <Badge
      variant="outline"
      className="border-warning/50 text-warning-foreground"
    >
      <ClockAlertIcon aria-hidden />
      Stale · {staleness.daysSinceReview}d
      <span className="sr-only"> since last review</span>
    </Badge>
  )
}
