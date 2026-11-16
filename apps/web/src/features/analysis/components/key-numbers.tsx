"use client"

import { useState } from "react"
import { CircleAlertIcon, ListChecksIcon } from "lucide-react"

import { Card } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

import { MoneyInput } from "@/components/blocks/numeric-inputs"
import { formatMoney } from "@/lib/format/money"
import { formatPercent } from "@/lib/format/percent"
import { useDeal } from "./deal-provider"

/** Inline money field that saves on blur / Enter (optimistically). */
function InlineMoney({
  inputKey,
  label,
  hint,
  needsAttention,
}: {
  inputKey: string
  label: string
  hint?: string
  needsAttention?: boolean
}) {
  const { built, setInput, openInput } = useDeal()
  const current = (built.resolved.values[inputKey] as number | undefined) ?? 0
  const [draft, setDraft] = useState<number | null>(null)
  const id = `key-${inputKey}`

  const commit = () => {
    if (draft === null || draft === current) {
      setDraft(null)
      return
    }
    const stored = built.resolved.provenance[inputKey]?.stored
    void setInput(inputKey, draft, {
      sourceText: stored?.sourceText ?? undefined,
      sourceUrl: stored?.sourceUrl ?? undefined,
      note: stored?.note ?? undefined,
    }).then(() => setDraft(null))
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div
        className={cn("rounded-lg", needsAttention && "ring-2 ring-warning/60")}
      >
        <MoneyInput
          id={id}
          value={draft ?? current}
          onValueChange={(v) => setDraft(v ?? 0)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur()
          }}
          aria-describedby={`${id}-hint`}
        />
      </div>
      <p
        id={`${id}-hint`}
        className={cn(
          "text-xs",
          needsAttention ? "text-warning-foreground" : "text-muted-foreground"
        )}
      >
        {hint}{" "}
        <button
          type="button"
          className="underline underline-offset-2 hover:text-foreground"
          onClick={() => openInput(inputKey)}
        >
          Source
        </button>
      </p>
    </div>
  )
}

/**
 * The main deal numbers: offer price, refurb cost and end value. Everything else comes
 * from the listing and your presets (shown underneath as Assumptions).
 */
export function KeyNumbers() {
  const { built, data, pending } = useDeal()
  const gdv = built.resolved.provenance["exit.gdv"]
  const gdvMissing = gdv?.origin === "default"
  const offerMissing = !built.resolved.values["purchase.price"]
  const lines = data.refurbLines.length
  const refurbMissing = lines === 0 && !built.resolved.values["refurb.budget"]
  const rent = built.resolved.values["keep.rentMonthly"] as number
  const rentEstimated = Boolean(
    built.resolved.provenance["keep.rentMonthly"]?.derived
  )

  return (
    <Card size="sm" className="gap-3 px-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">
          Your numbers{" "}
          <span
            aria-live="polite"
            className="text-xs font-normal text-muted-foreground"
          >
            {pending ? "Saving…" : ""}
          </span>
        </h3>
        {offerMissing || gdvMissing || refurbMissing ? (
          <span className="flex items-center gap-1 text-xs text-warning-foreground">
            <CircleAlertIcon className="size-3.5" aria-hidden /> Needed for a
            reliable verdict
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <InlineMoney
            inputKey="purchase.price"
            label="Offer price"
            hint={
              data.deal.askingPricePence !== null
                ? `Asking price ${formatMoney(data.deal.askingPricePence)}.`
                : "Enter your planned purchase price."
            }
            needsAttention={offerMissing}
          />
        </div>
        {lines > 0 ? (
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-medium">Refurb cost</span>
            <a
              href="#section-refurb"
              className="flex h-10 items-center gap-2 rounded-lg border px-3 text-sm tabular-nums md:h-8"
            >
              <ListChecksIcon
                className="size-4 text-muted-foreground"
                aria-hidden
              />
              {formatMoney(built.ok ? built.analysis.refurb.value : 0)}
            </a>
            <p className="text-xs text-muted-foreground">
              From {lines} line item{lines === 1 ? "" : "s"}, incl. contingency
            </p>
          </div>
        ) : (
          <InlineMoney
            inputKey="refurb.budget"
            label="Refurb cost"
            hint={
              refurbMissing
                ? "Add your refurb estimate."
                : `+ ${formatPercent(data.settings.defaults.refurb.contingency, 0)} contingency.`
            }
            needsAttention={refurbMissing}
          />
        )}
        <InlineMoney
          inputKey="exit.gdv"
          label="End value"
          hint={
            gdvMissing ? "Using the asking price for now." : "After refurb."
          }
          needsAttention={gdvMissing}
        />
      </div>
      {built.ok && built.analysis.keep.available ? (
        <p className="text-xs text-muted-foreground">
          Rent {formatMoney(rent)}/month{" "}
          {rentEstimated
            ? `(estimated at a ${formatPercent(data.settings.defaults.keep.grossYield, 1)} gross yield; change it under Keep)`
            : ""}
        </p>
      ) : null}
    </Card>
  )
}
