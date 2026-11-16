"use client"

import type * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

import { DealframeMark } from "@/components/brand/logo"
import { APP_NAME } from "@/lib/app"

import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string }
  workspaceName: string
}

/** App sidebar, adapted from shadcn `sidebar-07` (collapses to icons; sheet on mobile). */
export function AppSidebar({
  user,
  // No longer shown under the wordmark; kept out of the DOM props.
  workspaceName: _workspaceName,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="pointer-events-none"
              render={<div />}
            >
              {/* Symbol only when collapsed; the wordmark sits beside it. */}
              <div className="flex aspect-square size-8 items-center justify-center">
                <DealframeMark className="size-8" />
              </div>
              <div className="grid flex-1 gap-1 text-left leading-tight">
                <span className="truncate text-[1.0625rem] leading-none font-semibold tracking-[-0.015em]">
                  {APP_NAME}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser name={user.name} email={user.email} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
