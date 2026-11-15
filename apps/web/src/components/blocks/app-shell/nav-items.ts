import type { Route } from "next"
import {
  KanbanSquareIcon,
  LandmarkIcon,
  Settings2Icon,
  type LucideIcon,
} from "lucide-react"

export type NavItem = { title: string; href: Route; icon: LucideIcon }

export const NAV_ITEMS: readonly NavItem[] = [
  { title: "Pipeline", href: "/", icon: KanbanSquareIcon },
  { title: "Finance", href: "/finance", icon: LandmarkIcon },
  { title: "Settings", href: "/settings", icon: Settings2Icon },
]

/** The nav item a pathname belongs to ("/" only matches exactly). */
export function activeNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) =>
    item.href === "/"
      ? pathname === "/" || pathname.startsWith("/deals")
      : pathname.startsWith(item.href)
  )
}
