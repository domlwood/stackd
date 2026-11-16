import { cn } from "@workspace/ui/lib/utils"

import {
  PROVENANCE_DESCRIPTIONS,
  PROVENANCE_LABELS,
  type ProvenanceTag,
} from "../provenance"

const TONE: Record<ProvenanceTag, string> = {
  imported: "bg-brand-tint text-brand-text",
  estimated: "border border-dashed border-border text-muted-foreground",
  preset: "bg-muted text-muted-foreground",
  yours: "border border-border text-foreground",
  proposed: "bg-diff/10 text-diff-foreground",
  missing: "bg-warning/15 text-warning-foreground",
}

/** Small label saying where a number came from. Visible text, so no hover needed. */
export function ProvenanceChip({
  tag,
  className,
}: {
  tag: ProvenanceTag
  className?: string
}) {
  return (
    <span
      title={PROVENANCE_DESCRIPTIONS[tag]}
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded px-1.5 text-[0.6875rem] leading-none font-medium whitespace-nowrap",
        TONE[tag],
        className
      )}
    >
      {PROVENANCE_LABELS[tag]}
    </span>
  )
}
