"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"

import { APP_NAME } from "@/lib/app"

import { HeaderUserMenu } from "./header-user-menu"
import { activeNavItem } from "./nav-items"

/**
 * Top bar, adapted from shadcn `dashboard-01` SiteHeader.
 * `actions` contains the desktop Add deal link.
 */
export function SiteHeader({
  actions,
  user,
}: {
  actions?: ReactNode
  user: { name: string; email: string }
}) {
  const pathname = usePathname()
  // Pages reached from the + button or the profile menu, not the nav.
  const OFF_NAV_TITLES: Record<string, string> = {
    "/deals/new": "Analyse a property",
    "/settings": "Settings",
  }
  const title =
    OFF_NAV_TITLES[pathname] ?? activeNavItem(pathname)?.title ?? APP_NAME

  return (
    <header className="sticky top-0 z-10 box-content flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur transition-[width,height] ease-linear supports-backdrop-filter:bg-background/80">
      <div className="flex w-full items-center gap-2 px-4">
        {/* Phones navigate with the bottom tab bar; the sidebar toggle is desktop-only. */}
        <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
        <Separator
          orientation="vertical"
          className="mx-1 hidden md:block data-vertical:h-4 data-vertical:self-auto"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <div className="md:hidden">
            <HeaderUserMenu name={user.name} email={user.email} />
          </div>
        </div>
      </div>
    </header>
  )
}
