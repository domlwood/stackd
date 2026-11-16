"use client"

import { usePathname } from "next/navigation"
import { useState, useTransition } from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

import { ResponsiveSheet } from "@/components/blocks/responsive-sheet"
import { loadNewDealOptions } from "@/features/capture/actions"
import { NewDealFlow } from "@/features/capture/components/new-deal-flow"
import type { NewDealOptions } from "@/features/capture/options"

/**
 * The permanent + button (bottom right, every page) and the import sheet it
 * opens: a bottom sheet on phones, a side sheet from md up. Products load when
 * it opens, so pages don't pay for them. Hidden on /deals/new and /settings.
 */
export function NewDealLauncher() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<NewDealOptions | null>(null)
  const [loading, startLoading] = useTransition()

  const openSheet = () => {
    setOpen(true)
    startLoading(async () => {
      try {
        setOptions(await loadNewDealOptions())
      } catch {
        toast.error("Couldn't load your finance products. Try again.")
        setOpen(false)
      }
    })
  }

  // Not on the import page itself, nor over the Settings save bar.
  if (pathname === "/deals/new" || pathname === "/settings") return null

  return (
    <>
      <Button
        aria-label="Analyse a property"
        aria-haspopup="dialog"
        onClick={openSheet}
        className={cn(
          "fixed right-[max(1rem,env(safe-area-inset-right))] z-20 size-14 rounded-full shadow-md [&_svg]:size-6",
          // Above the phone tab bar; bottom corner on larger screens.
          "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:right-6 md:bottom-6"
        )}
      >
        <PlusIcon aria-hidden />
      </Button>
      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title="Analyse a property"
      >
        {options && !loading ? (
          <NewDealFlow
            // Fresh flow each time it opens (no stale URL or error).
            key={String(open)}
            variant="sheet"
            products={options.products}
            defaultProductId={options.defaultProductId}
            onDone={() => setOpen(false)}
          />
        ) : (
          <div
            className="flex items-center gap-2 py-8 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <Spinner /> Loading…
          </div>
        )}
      </ResponsiveSheet>
    </>
  )
}
