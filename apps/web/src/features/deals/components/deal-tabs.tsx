"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Route } from "next"

import { cn } from "@workspace/ui/lib/utils"

const TABS = [
  { segment: "", label: "Analysis" },
  { segment: "/comps", label: "Comps" },
  { segment: "/listing", label: "Listing" },
  { segment: "/discussion", label: "Discussion" },
  { segment: "/activity", label: "Activity" },
] as const

/** Route-based tabs (deep-linkable), horizontally scrollable on phones. */
export function DealTabs({ dealId }: { dealId: string }) {
  const pathname = usePathname()
  const base = `/deals/${dealId}`
  return (
    <nav
      aria-label="Deal sections"
      className="-mx-4 overflow-x-auto border-b px-4 md:mx-0 md:px-0"
    >
      <ul className="flex min-w-max gap-1">
        {TABS.map((tab) => {
          const href = `${base}${tab.segment}`
          const active = pathname === href
          return (
            <li key={tab.label}>
              <Link
                href={href as Route}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent"
                )}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
