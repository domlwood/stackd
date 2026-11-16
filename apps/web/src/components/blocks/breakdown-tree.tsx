"use client"

/**
 * BreakdownTree — renders a calc Figure and its working as an expandable tree.
 * Numbers right-aligned in tabular figures; rows linked to inputs show an edit
 * affordance that calls onOpenInput(key).
 *
 * Props:
 *  - figure: Figure (from lib/calc)
 *  - onOpenInput?: (key) => void
 *  - defaultExpandedDepth?: number (default 0: only the root's children visible)
 *  - signedChildren?: show +/− on child values (for "a − b − c" breakdowns)
 *  - highlightKeys?: input keys to mark as differing (diff markers, phase 6)
 *
 * Usage: <BreakdownTree figure={analysis.flip.figures.profit} onOpenInput={openInput} signedChildren />
 */
import { useId, useState } from "react"
import { ChevronRightIcon, PencilIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import type { Figure } from "@/lib/calc/types"
import { formatFigureValue } from "@/features/analysis/format"

type Props = {
  figure: Figure
  onOpenInput?: (key: string) => void
  defaultExpandedDepth?: number
  signedChildren?: boolean
  highlightKeys?: ReadonlySet<string>
}

export function BreakdownTree({
  figure,
  onOpenInput,
  defaultExpandedDepth = 0,
  signedChildren,
  highlightKeys,
}: Props) {
  return (
    <div role="tree" aria-label={figure.label} className="text-sm">
      <Row
        figure={figure}
        depth={0}
        expandDepth={defaultExpandedDepth}
        onOpenInput={onOpenInput}
        signed={false}
        signedChildren={signedChildren}
        highlightKeys={highlightKeys}
        isRoot
      />
    </div>
  )
}

function Row({
  figure,
  depth,
  expandDepth,
  onOpenInput,
  signed,
  signedChildren,
  highlightKeys,
  isRoot,
}: {
  figure: Figure
  depth: number
  expandDepth: number
  onOpenInput?: (key: string) => void
  signed: boolean
  signedChildren?: boolean
  highlightKeys?: ReadonlySet<string>
  isRoot?: boolean
}) {
  const children = figure.children ?? []
  const [open, setOpen] = useState(isRoot || depth < expandDepth)
  const groupId = useId()
  const hasChildren = children.length > 0
  const inputKey = figure.inputs?.[0]
  const differs = figure.inputs?.some((k) => highlightKeys?.has(k)) ?? false
  const indent = { paddingLeft: `${depth * 0.875}rem` }

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? open : undefined}
      aria-selected={false}
    >
      <div
        className={cn(
          "group flex min-h-9 items-start gap-1 rounded-md py-1.5 pr-1",
          isRoot ? "font-medium" : "",
          differs && "bg-diff/10"
        )}
        style={indent}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-controls={groupId}
            aria-label={`${open ? "Hide" : "Show"} working for ${figure.label}`}
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronRightIcon
              className={cn("size-4 transition-transform", open && "rotate-90")}
              aria-hidden
            />
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span className="min-w-0 flex-1">{figure.label}</span>
            {inputKey && onOpenInput ? (
              <button
                type="button"
                onClick={() => onOpenInput(inputKey)}
                aria-label={`Edit ${figure.label}`}
                className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-70 hover:bg-muted hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:opacity-0 md:group-hover:opacity-100"
              >
                <PencilIcon className="size-3.5" aria-hidden />
              </button>
            ) : null}
            <span
              className={cn(
                "shrink-0 num",
                figure.value < 0 &&
                  figure.unit === "pence" &&
                  "text-muted-foreground"
              )}
            >
              {formatFigureValue(figure, { signed })}
            </span>
          </div>
          {open && (figure.formula || figure.note) ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {figure.formula}
              {figure.formula && figure.note ? " · " : null}
              {figure.note}
            </p>
          ) : null}
        </div>
      </div>
      {hasChildren && open ? (
        <div
          role="group"
          id={groupId}
          className="border-l border-border/60"
          style={{ marginLeft: `${depth * 0.875 + 0.6}rem` }}
        >
          {children.map((child) => (
            <Row
              key={child.key}
              figure={child}
              depth={1}
              expandDepth={expandDepth - 1}
              onOpenInput={onOpenInput}
              signed={Boolean(signedChildren)}
              signedChildren={signedChildren}
              highlightKeys={highlightKeys}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
