import { Skeleton } from "@workspace/ui/components/skeleton"

import { AnalysisReady } from "@/features/analysis/components/deal-provider"
import { KeyNumbers } from "@/features/analysis/components/key-numbers"
import { MetricStrip } from "@/features/analysis/components/metric-strip"

/**
 * Summary: exactly what you want to see. The verdict and both exits, then
 * the few numbers that decide it. Everything else is in Numbers; the
 * property itself is on Rightmove (linked in the header).
 */
export default function DealSummaryPage() {
  // The engine runs in the browser after hydration, not in the Worker's server render.
  return (
    <AnalysisReady
      fallback={
        <div
          aria-busy="true"
          aria-label="Running the numbers"
          className="flex flex-col gap-4"
        >
          <Skeleton className="h-40" />
          <Skeleton className="h-16" />
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <MetricStrip />
        <KeyNumbers />
      </div>
    </AnalysisReady>
  )
}
