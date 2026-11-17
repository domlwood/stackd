import type { Metadata } from "next"

import { Skeleton } from "@workspace/ui/components/skeleton"

import { AnalysisView } from "@/features/analysis/components/analysis-view"
import { AnalysisReady } from "@/features/analysis/components/deal-provider"
import { HomeToggle } from "@/features/analysis/components/home-toggle"

export const metadata: Metadata = { title: "Numbers" }

/** How you're buying, every assumption, and the working behind each figure. */
export default function DealNumbersPage() {
  // The engine runs in the browser after hydration, not in the Worker's server render.
  return (
    <AnalysisReady fallback={<Skeleton className="h-80" aria-hidden />}>
      <div className="flex flex-col gap-6">
        <HomeToggle />
        <AnalysisView />
      </div>
    </AnalysisReady>
  )
}
