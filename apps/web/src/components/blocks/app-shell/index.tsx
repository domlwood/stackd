/**
 * AppShell — the authenticated layout, mobile first:
 *  - phones (< md): sticky header + bottom tab bar (MobileTabBar)
 *  - md and up: collapsible icon sidebar (shadcn sidebar-07) + sticky header
 *
 * Props:
 *  - user: { name, email } shown in the sidebar footer menu
 *  - workspaceName: shown under the logo
 *  - headerActions?: ReactNode rendered at the right of the header (paste bar)
 *  - children: page content (rendered in <main id="main">)
 *
 * Usage:
 *   <AppShell user={{ name, email }} workspaceName="Our deals">{children}</AppShell>
 */
import type { CSSProperties, ReactNode } from "react"

import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"

import { AppSidebar } from "./app-sidebar"
import { MobileTabBar } from "./mobile-tab-bar"
import { SiteHeader } from "./site-header"

const HEADER_HEIGHT = "3.5rem"

type AppShellProps = {
  user: { name: string; email: string }
  workspaceName: string
  headerActions?: ReactNode
  children: ReactNode
}

export function AppShell({
  user,
  workspaceName,
  headerActions,
  children,
}: AppShellProps) {
  return (
    <SidebarProvider
      style={{ "--header-height": HEADER_HEIGHT } as CSSProperties}
    >
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <AppSidebar user={user} workspaceName={workspaceName} />
      <SidebarInset>
        <SiteHeader actions={headerActions} user={user} />
        <main
          id="main"
          tabIndex={-1}
          className="flex flex-1 flex-col gap-4 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] outline-none md:p-6 md:pb-6"
        >
          {children}
        </main>
      </SidebarInset>
      <MobileTabBar />
    </SidebarProvider>
  )
}
