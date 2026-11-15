"use client"

import { useState } from "react"
import { RotateCcwIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"

import { FormField } from "@/components/blocks/form-field"
import {
  MoneyInput,
  MonthsInput,
  PercentInput,
} from "@/components/blocks/numeric-inputs"
import { OptionSelect } from "@/components/blocks/option-select"
import { ResponsiveSheet } from "@/components/blocks/responsive-sheet"
import { formatRelative } from "@/lib/format/date"
import { inputDef, type InputDef } from "@/lib/inputs/registry"
import { PRODUCT_TYPE_LABELS } from "@/features/finance/schemas"
import { defaultsSourceFor } from "../build"
import { formatInputValue } from "../format"
import { useDeal } from "./deal-provider"

const NONE = "none"

function ValueEditor({
  def,
  value,
  onChange,
  invalid,
}: {
  def: InputDef
  value: unknown
  onChange: (v: unknown) => void
  invalid: boolean
}) {
  const { data } = useDeal()
  const id = "input-value"
  switch (def.kind) {
    case "money":
      return (
        <MoneyInput
          id={id}
          value={(value as number | null) ?? null}
          onValueChange={onChange}
          aria-invalid={invalid}
          autoFocus
        />
      )
    case "ratio":
      return (
        <PercentInput
          id={id}
          value={(value as number | null) ?? null}
          onValueChange={onChange}
          aria-invalid={invalid}
          autoFocus
        />
      )
    case "months":
      return (
        <MonthsInput
          id={id}
          value={(value as number | null) ?? null}
          onValueChange={onChange}
          aria-invalid={invalid}
          autoFocus
        />
      )
    case "boolean":
      return (
        <Field orientation="horizontal">
          <Switch id={id} checked={Boolean(value)} onCheckedChange={onChange} />
          <FieldLabel htmlFor={id} className="font-normal">
            {value ? "Yes" : "No"}
          </FieldLabel>
        </Field>
      )
    case "enum":
      return (
        <OptionSelect
          id={id}
          value={(value as string) ?? null}
          onValueChange={onChange}
          options={def.options ?? {}}
        />
      )
    case "date":
      return (
        <Input
          id={id}
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
        />
      )
    case "product": {
      const allowed =
        def.key === "keep.product"
          ? ["btl", "residential"]
          : ["cash", "bridging", "residential", "btl"]
      const options: Record<string, string> = { [NONE]: "None" }
      for (const p of data.products) {
        if ((!p.archivedAt || p.id === value) && allowed.includes(p.type))
          options[p.id] =
            `${p.lender} · ${p.name} (${PRODUCT_TYPE_LABELS[p.type]})`
      }
      return (
        <OptionSelect
          id={id}
          value={(value as string | null) ?? NONE}
          onValueChange={(v) => onChange(v === NONE ? null : v)}
          options={options}
        />
      )
    }
  }
}

/** Side sheet for one input: value, source, note, owner, and reset to default. */
export function InputSheet() {
  const { activeInputKey, openInput } = useDeal()
  const def = activeInputKey ? inputDef(activeInputKey) : undefined
  return (
    <ResponsiveSheet
      open={Boolean(def)}
      onOpenChange={(open) => !open && openInput(null)}
      title={def?.label ?? "Input"}
      description={def?.description}
    >
      {def ? <InputEditor key={def.key} def={def} /> : null}
    </ResponsiveSheet>
  )
}

function InputEditor({ def }: { def: InputDef }) {
  const { built, data, setInput, resetInput, openInput, memberName, pending } =
    useDeal()
  const provenance = built.resolved.provenance[def.key]
  const stored = provenance?.stored
  const [value, setValue] = useState<unknown>(built.resolved.values[def.key])
  const [sourceText, setSourceText] = useState(stored?.sourceText ?? "")
  const [sourceUrl, setSourceUrl] = useState(stored?.sourceUrl ?? "")
  const [note, setNote] = useState(stored?.note ?? "")
  const [error, setError] = useState<string | null>(null)
  const defaultValue = def.defaultValue(
    defaultsSourceFor(data.deal, data.settings, data.today)
  )

  const save = async () => {
    const parsed = def.schema.safeParse(value)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "That value isn't valid")
      return
    }
    if (sourceUrl && !/^https?:\/\//.test(sourceUrl)) {
      setError("Source links need to start with https://")
      return
    }
    openInput(null)
    await setInput(def.key, parsed.data, { sourceText, sourceUrl, note })
  }

  const reset = async () => {
    openInput(null)
    await resetInput(def.key)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
      noValidate
    >
      <FieldGroup>
        <FormField
          id="input-value"
          label="Value"
          error={error ?? undefined}
          description={`Default: ${formatInputValue(def, defaultValue, data.products)}`}
        >
          <ValueEditor
            def={def}
            value={value}
            onChange={(v) => {
              setError(null)
              setValue(v)
            }}
            invalid={Boolean(error)}
          />
        </FormField>
        <FormField
          id="input-source"
          label="Source"
          description="Where this number comes from, e.g. “Agent's rental valuation”."
        >
          <Input
            id="input-source"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            maxLength={500}
          />
        </FormField>
        <FormField id="input-url" label="Source link">
          <Input
            id="input-url"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </FormField>
        <FormField id="input-note" label="Note">
          <Textarea
            id="input-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
          />
        </FormField>

        <p className="text-sm text-muted-foreground">
          {stored
            ? `Agreed · set by ${memberName(stored.setBy)} ${formatRelative(stored.setAt)}`
            : "Using the default from your settings."}
        </p>

        <div className="flex flex-row items-center justify-end gap-2">
          {provenance?.origin === "agreed" ? (
            <Button
              type="button"
              variant="ghost"
              className="mr-auto"
              onClick={() => void reset()}
              disabled={pending}
            >
              <RotateCcwIcon aria-hidden />
              Use default
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => openInput(null)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending} className="max-sm:flex-1">
            {pending ? <Spinner /> : null}
            Save
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
