"use client"

/**
 * ResponsiveSheet — a form/detail panel that is a bottom sheet on phones and a
 * right-hand side sheet from md up. Content scrolls; footer stays pinned.
 *
 * Props:
 *  - open / onOpenChange: controlled state
 *  - title, description?: accessible heading
 *  - footer?: actions pinned to the bottom (e.g. Cancel / Save)
 *  - children: body
 *
 * Usage:
 *   <ResponsiveSheet open={open} onOpenChange={setOpen} title="Add fund pot" footer={<Button>Save</Button>}>
 *     <FundPotFields />
 *   </ResponsiveSheet>
 */
import type { ReactNode } from "react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { cn } from "@workspace/ui/lib/utils"

type ResponsiveSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  footer?: ReactNode
  children: ReactNode
  className?: string
}

export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
}: ResponsiveSheetProps) {
  const isMobile = useIsMobile()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "gap-0 p-0",
          isMobile
            ? "max-h-[92dvh] rounded-t-xl pb-[env(safe-area-inset-bottom)]"
            : "w-full sm:max-w-lg",
          className
        )}
      >
        {isMobile ? (
          <div
            aria-hidden
            className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted"
          />
        ) : null}
        <SheetHeader className="border-b">
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
        {footer ? (
          <SheetFooter className="flex-row items-center justify-end border-t">
            {footer}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
