"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Route } from "next"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Summary · Numbers · Notes. Numbers are shared: you both edit the same
 * agreed figures. Notes is hidden on wide screens, where the
 * notes panel sits beside the content. Property details and Activity are pages
 * without tabs: reached from the header and from Notes.
 */
const TABS = [
  { segment: "", label: "Summary" },
  { segment: "/numbers", label: "Numbers" },
  { segment: "/notes", label: "Notes", wide: false },
] as const

/** Route-based tabs (deep-linkable), sticky under the header. */
export function DealTabs({
  dealId,
  noteCount,
}: {
  dealId: string
  noteCount: number
}) {
  const pathname = usePathname()
  const base = `/deals/${dealId}`
  return (
    <nav
      aria-label="Deal sections"
      className="sticky top-[var(--header-height)] z-10 -mx-4 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 md:-mx-6 md:px-6"
    >
      <ul className="flex gap-1">
        {TABS.map((tab) => {
          const href = `${base}${tab.segment}`
          const active = pathname === href
          return (
            <li
              key={tab.label}
              className={cn(
                "flex-1 sm:flex-none",
                "wide" in tab && !tab.wide && "xl:hidden"
              )}
            >
              <Link
                href={href as Route}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex min-h-11 items-center justify-center gap-1.5 border-b-2 px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent"
                )}
              >
                {tab.label}
                {tab.segment === "/notes" && noteCount > 0 ? (
                  <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">
                    {noteCount}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
