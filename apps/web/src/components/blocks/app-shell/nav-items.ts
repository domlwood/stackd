import type { Route } from "next"
import { KanbanSquareIcon, LandmarkIcon, type LucideIcon } from "lucide-react"

export type NavItem = {
  title: string
  href: Route
  icon: LucideIcon
  /** Does this item own the pathname? */
  matches: (pathname: string) => boolean
}

// Analysing a property is the permanent + button, not a tab.
// Settings returns to the nav once it has real controls (buy box, defaults).
export const NAV_ITEMS: readonly NavItem[] = [
  {
    title: "Deals",
    href: "/",
    icon: KanbanSquareIcon,
    matches: (p) => p === "/" || p.startsWith("/deals"),
  },
  {
    title: "Finance",
    href: "/finance",
    icon: LandmarkIcon,
    matches: (p) => p.startsWith("/finance"),
  },
]

/** The nav item a pathname belongs to; the first match wins. */
export function activeNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.matches(pathname))
}
