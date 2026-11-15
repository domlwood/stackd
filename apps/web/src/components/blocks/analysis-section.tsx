"use client"

/**
 * AnalysisSection — collapsible section with a headline value visible when closed
 * (progressive disclosure). Open state is per section and remembered per viewer.
 *
 * Props: id, title, summary? (ReactNode, right-aligned), defaultOpen?, children
 * Usage: <AnalysisSection id="flip" title="Exit A · Flip" summary="£27,960">…</AnalysisSection>
 */
import { useEffect, useState, type ReactNode } from "react"
import { ChevronDownIcon } from "lucide-react"

import { Card } from "@workspace/ui/components/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { cn } from "@workspace/ui/lib/utils"

const STORAGE_PREFIX = "analysis-section:"

function readStored(id: string): boolean | null {
  try {
    const value = window.localStorage.getItem(STORAGE_PREFIX + id)
    return value === null ? null : value === "1"
  } catch {
    return null
  }
}

export function AnalysisSection({
  id,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  id: string
  title: string
  summary?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    const stored = readStored(id)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from browser storage after hydration
    if (stored !== null) setOpen(stored)
  }, [id])

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    try {
      window.localStorage.setItem(STORAGE_PREFIX + id, next ? "1" : "0")
    } catch {
      // storage unavailable: fine, state just isn't remembered
    }
  }

  return (
    <Card className="gap-0 py-0" id={`section-${id}`}>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset">
          <h3 className="flex-1 font-medium">{title}</h3>
          {summary ? (
            <span className="num text-sm font-medium">{summary}</span>
          ) : null}
          <ChevronDownIcon
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-4 border-t px-4 py-4">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
