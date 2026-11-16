"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"

import { NAV_ITEMS, activeNavItem } from "./nav-items"

/**
 * Bottom tab bar: primary navigation on phones (< md). Thumb-reachable,
 * 56px+ targets, respects the iOS home-indicator safe area.
 */
export function MobileTabBar() {
  const pathname = usePathname()
  const active = activeNavItem(pathname)

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden"
    >
      <ul className="grid grid-cols-2">
        {NAV_ITEMS.map((item) => {
          const isActive = active?.href === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors select-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
                  isActive && "text-brand-text"
                )}
              >
                <item.icon className="size-5" aria-hidden />
                {item.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
