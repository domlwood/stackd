"use client"

import { ChevronRightIcon, LinkIcon, StickyNoteIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { inputDef } from "@/lib/inputs/registry"
import { formatInputValue } from "../format"
import { useDeal } from "./deal-provider"

/** Tappable rows for a set of inputs: label, value, and where the value came from. */
export function InputList({
  keys,
  title,
}: {
  keys: readonly string[]
  title?: string
}) {
  const { built, data, openInput } = useDeal()
  return (
    <div>
      {title ? (
        <h4 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h4>
      ) : null}
      <ul className="-mx-2 divide-y divide-border/60">
        {keys.map((key) => {
          const def = inputDef(key)
          if (!def) return null
          const provenance = built.resolved.provenance[key]
          const value = built.resolved.values[key]
          const stored = provenance?.stored
          const isDefault = provenance?.origin === "default"
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => openInput(key)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  provenance?.differsFromAgreed && "bg-diff/10"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{def.label}</span>
                  {stored?.sourceText ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {stored.sourceText}
                    </span>
                  ) : null}
                </span>
                {stored?.sourceUrl ? (
                  <LinkIcon
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-label="Has a source link"
                  />
                ) : null}
                {stored?.note ? (
                  <StickyNoteIcon
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-label="Has a note"
                  />
                ) : null}
                <span
                  className={cn(
                    "max-w-[60%] truncate num",
                    isDefault && "text-muted-foreground"
                  )}
                >
                  {formatInputValue(def, value, data.products)}
                  {isDefault ? (
                    <span className="sr-only"> (default)</span>
                  ) : null}
                </span>
                <ChevronRightIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
