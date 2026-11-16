import { cn } from "@workspace/ui/lib/utils"

import { APP_NAME } from "@/lib/app"

/*
 * Provisional Dealframe symbol (docs/BRAND_IDENTITY.md §3): two offset,
 * overlapping square frames — lower-left and upper-right — with a muted
 * cobalt square filling their overlap. Not the approved master: swap in the
 * canonical SVG once it's signed off. Frames use currentColor (ink / off-white).
 */
export function DealframeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <rect x="13" y="13" width="6" height="6" className="fill-brand" />
      <g stroke="currentColor" strokeWidth="2.5" strokeLinejoin="miter">
        <rect x="2.25" y="11.75" width="18" height="18" />
        <rect x="11.75" y="2.25" width="18" height="18" />
      </g>
    </svg>
  )
}

/** Primary horizontal lockup: symbol left, lowercase wordmark right. */
export function DealframeLockup({
  className,
  markClassName,
}: {
  className?: string
  markClassName?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <DealframeMark className={cn("size-6", markClassName)} />
      <span className="text-[1.0625rem] leading-none font-semibold tracking-[-0.015em]">
        {APP_NAME}
      </span>
    </span>
  )
}
