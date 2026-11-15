"use client"

/**
 * CommandPalette — ⌘K / Ctrl+K: paste a Rightmove link to analyse it, or jump to a page.
 * The header button opens it on every screen size (it's the paste bar on phones).
 */
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { useEffect, useState } from "react"
import { LinkIcon, PlusIcon, SearchIcon, SparklesIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { Kbd } from "@workspace/ui/components/kbd"

import { NAV_ITEMS } from "./nav-items"

const RIGHTMOVE =
  /rightmove\.co\.uk\/(properties\/\d+|property-for-sale\/property-\d+)/i

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const isListing = RIGHTMOVE.test(query)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    setQuery("")
    router.push(href as Route)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground max-sm:size-10 max-sm:p-0 sm:w-56 sm:justify-start"
        aria-label="Paste a Rightmove link or search"
      >
        <LinkIcon aria-hidden />
        <span className="max-sm:sr-only">Paste a Rightmove link…</span>
        <Kbd className="ml-auto max-sm:hidden">⌘K</Kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Paste a link or go to…"
        description="Paste a Rightmove link to analyse it, or jump to a page."
      >
        <CommandInput
          placeholder="Paste a Rightmove link, or type to search…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            Nothing matches. Paste a full Rightmove property link.
          </CommandEmpty>
          {isListing ? (
            <CommandGroup heading="Listing">
              <CommandItem
                value={`analyse ${query}`}
                onSelect={() =>
                  go(`/deals/new?url=${encodeURIComponent(query.trim())}`)
                }
              >
                <SparklesIcon aria-hidden />
                Analyse this listing
              </CommandItem>
            </CommandGroup>
          ) : null}
          <CommandGroup heading="Go to">
            <CommandItem value="new deal add" onSelect={() => go("/deals/new")}>
              <PlusIcon aria-hidden />
              New deal
            </CommandItem>
            {NAV_ITEMS.map((item) => (
              <CommandItem
                key={item.href}
                value={item.title}
                onSelect={() => go(item.href)}
              >
                <item.icon aria-hidden />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Tip">
            <CommandItem value="tip" disabled>
              <SearchIcon aria-hidden />
              Copy a Rightmove link, press ⌘K, paste
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
