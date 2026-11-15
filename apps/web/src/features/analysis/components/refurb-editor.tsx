"use client"

import { useState, useTransition } from "react"
import {
  ChevronRightIcon,
  PlusIcon,
  Trash2Icon,
  WandSparklesIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { FieldGroup } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import { ConfirmDialog } from "@/components/blocks/confirm-dialog"
import { FormField } from "@/components/blocks/form-field"
import { MoneyInput } from "@/components/blocks/numeric-inputs"
import { OptionSelect } from "@/components/blocks/option-select"
import { ResponsiveSheet } from "@/components/blocks/responsive-sheet"
import { quickRefurbEstimate } from "@/lib/calc/refurb"
import { formatMoney } from "@/lib/format/money"
import { refurbItemCostKey } from "@/lib/inputs/registry"
import {
  applyRefurbEstimate,
  deleteRefurbItem,
  saveRefurbItem,
} from "@/features/deals/actions"
import { REFURB_CATEGORIES } from "@/features/deals/schemas"
import type { RefurbLineRecord } from "@/features/deals/types"
import { useDeal } from "./deal-provider"

const CATEGORY_OPTIONS = Object.fromEntries(
  REFURB_CATEGORIES.map((c) => [c, c])
) as Record<string, string>
type Condition = "light" | "medium" | "heavy"
const CONDITION_LABELS: Record<Condition, string> = {
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
}

export function RefurbEditor() {
  const { data, built } = useDeal()
  const [editing, setEditing] = useState<RefurbLineRecord | "new" | null>(null)
  const lines = data.refurbLines

  return (
    <div className="flex flex-col gap-3">
      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No refurb lines yet. Add them one by one, or start from a quick
          estimate below.
        </p>
      ) : (
        <ul className="-mx-2 divide-y divide-border/60">
          {lines.map((line) => {
            const key = refurbItemCostKey(line.id)
            const cost = (built.resolved.values[key] as number | undefined) ?? 0
            const source = built.resolved.provenance[key]?.stored?.sourceText
            return (
              <li key={line.id}>
                <button
                  type="button"
                  onClick={() => setEditing(line)}
                  className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{line.category}</span>
                    {line.description || source ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {[line.description, source].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 num">{formatMoney(cost)}</span>
                  <ChevronRightIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => setEditing("new")}
      >
        <PlusIcon aria-hidden />
        Add line
      </Button>
      <QuickEstimate />
      <RefurbLineSheet line={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function QuickEstimate() {
  const { data } = useDeal()
  const [condition, setCondition] = useState<Condition>("medium")
  const [pending, startTransition] = useTransition()
  const area = data.deal.floorAreaSqm
  const rate =
    data.settings.defaults.refurb.conditionRatesPencePerSqft[condition]
  const total = area ? quickRefurbEstimate(area, rate) : null

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <WandSparklesIcon className="size-4" aria-hidden />
        Quick estimate
      </div>
      {area ? (
        <div className="flex flex-col gap-3">
          <ToggleGroup
            aria-label="Condition"
            variant="outline"
            size="sm"
            value={[condition]}
            onValueChange={(v: string[]) =>
              v[0] && setCondition(v[0] as Condition)
            }
          >
            {(Object.keys(CONDITION_LABELS) as Condition[]).map((c) => (
              <ToggleGroupItem key={c} value={c}>
                {CONDITION_LABELS[c]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-sm text-muted-foreground">
            {Math.round(area * 10.7639).toLocaleString("en-GB")} sq ft ×{" "}
            {formatMoney(rate)}/sq ft ={" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatMoney(total ?? 0)}
            </span>
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="self-start"
            disabled={pending || !total}
            onClick={() =>
              startTransition(async () => {
                const result = await applyRefurbEstimate({
                  dealId: data.deal.id,
                  totalPence: total,
                })
                if (result.ok)
                  toast.success(
                    "Estimate added as line items. Adjust them as quotes come in."
                  )
                else toast.error(result.message)
              })
            }
          >
            {pending ? <Spinner /> : null}
            Add as line items
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Add the floor area in the Listing tab to estimate from £/sq ft.
        </p>
      )}
    </div>
  )
}

function RefurbLineSheet({
  line,
  onClose,
}: {
  line: RefurbLineRecord | "new" | null
  onClose: () => void
}) {
  const open = line !== null
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={line === "new" ? "Add refurb line" : "Edit refurb line"}
    >
      {open ? (
        <RefurbLineForm
          key={line === "new" ? "new" : line.id}
          line={line === "new" ? null : line}
          onClose={onClose}
        />
      ) : null}
    </ResponsiveSheet>
  )
}

function RefurbLineForm({
  line,
  onClose,
}: {
  line: RefurbLineRecord | null
  onClose: () => void
}) {
  const { data, built, setInput } = useDeal()
  const costKey = line ? refurbItemCostKey(line.id) : null
  const stored = costKey ? built.resolved.provenance[costKey]?.stored : null
  const [category, setCategory] = useState(line?.category ?? "Kitchen")
  const [description, setDescription] = useState(line?.description ?? "")
  const [cost, setCost] = useState<number | null>(
    costKey ? ((built.resolved.values[costKey] as number) ?? 0) : null
  )
  const [source, setSource] = useState(stored?.sourceText ?? "")
  const [confirm, setConfirm] = useState(false)
  const [pending, startTransition] = useTransition()

  const save = () =>
    startTransition(async () => {
      const result = await saveRefurbItem({
        id: line?.id,
        dealId: data.deal.id,
        category,
        description,
      })
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      if (cost !== null)
        await setInput(refurbItemCostKey(result.data.id), cost, {
          sourceText: source,
        })
      onClose()
    })

  const remove = () =>
    startTransition(async () => {
      if (!line) return
      const result = await deleteRefurbItem(line.id, data.deal.id)
      setConfirm(false)
      if (!result.ok) toast.error(result.message)
      else {
        toast.success("Refurb line removed")
        onClose()
      }
    })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <FieldGroup>
        <FormField id="refurb-category" label="Category">
          <OptionSelect
            id="refurb-category"
            value={category}
            onValueChange={setCategory}
            options={CATEGORY_OPTIONS}
          />
        </FormField>
        <FormField id="refurb-description" label="Description">
          <Input
            id="refurb-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            placeholder="e.g. Full rewire, consumer unit"
          />
        </FormField>
        <FormField id="refurb-cost" label="Cost">
          <MoneyInput id="refurb-cost" value={cost} onValueChange={setCost} />
        </FormField>
        <FormField
          id="refurb-source"
          label="Source"
          description="e.g. “Quote from J. Smith Electrical”"
        >
          <Input
            id="refurb-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            maxLength={500}
          />
        </FormField>
        <div className="flex flex-row items-center justify-end gap-2">
          {line ? (
            <Button
              type="button"
              variant="destructive"
              className="mr-auto"
              onClick={() => setConfirm(true)}
              disabled={pending}
            >
              <Trash2Icon aria-hidden />
              <span className="max-sm:sr-only">Delete</span>
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending} className="max-sm:flex-1">
            {pending ? <Spinner /> : null}
            Save
          </Button>
        </div>
      </FieldGroup>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this refurb line?"
        description="Its cost is removed from the analysis. The change is kept in the activity log."
        confirmLabel="Delete line"
        onConfirm={remove}
        pending={pending}
      />
    </form>
  )
}
