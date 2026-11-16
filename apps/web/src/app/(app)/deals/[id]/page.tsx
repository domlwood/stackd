import { Skeleton } from "@workspace/ui/components/skeleton"

import { AnalysisReady } from "@/features/analysis/components/deal-provider"
import { AnalysisView } from "@/features/analysis/components/analysis-view"

export default function DealAnalysisPage() {
  // The engine runs in the browser after hydration, not in the Worker's server render.
  return (
    <AnalysisReady fallback={<Skeleton className="h-80" aria-hidden />}>
      <AnalysisView />
    </AnalysisReady>
  )
}
