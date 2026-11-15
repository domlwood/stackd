"use client"

/**
 * Numeric inputs that keep domain units out of the user's way:
 *  - MoneyInput: user types pounds ("245k", "1,999.50"); value is integer pence.
 *  - PercentInput: user types percent ("5.49"); value is a fraction (0.0549).
 *  - MonthsInput: whole months.
 * All are controlled, accept `null` for empty, use the right mobile keyboard,
 * and reformat on blur. Props mirror <input> (id, aria-invalid, disabled, name).
 *
 * Usage:
 *   <MoneyInput id="amount" value={pence} onValueChange={setPence} />
 *   <PercentInput id="rate" value={0.0549} onValueChange={setRate} />
 */
import { useState, type ComponentProps } from "react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@workspace/ui/components/input-group"

import { PENCE_PER_POUND, parseMoneyInput } from "@/lib/format/money"
import { parsePercentInput } from "@/lib/format/percent"

type BaseProps = Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "type" | "defaultValue"
> & {
  value: number | null
  onValueChange: (value: number | null) => void
}

const PERCENT_DIGITS = 4

function useDraft(value: number | null, toText: (v: number) => string) {
  const [draft, setDraft] = useState<string | null>(null)
  return {
    text: draft ?? (value === null ? "" : toText(value)),
    setDraft,
  }
}

const poundsText = (pence: number) =>
  new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: pence % PENCE_PER_POUND === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pence / PENCE_PER_POUND)

export function MoneyInput({
  value,
  onValueChange,
  onBlur,
  ...props
}: BaseProps) {
  const { text, setDraft } = useDraft(value, poundsText)
  return (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>£</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        {...props}
        inputMode="decimal"
        autoComplete="off"
        className="num"
        value={text}
        onChange={(event) => {
          setDraft(event.target.value)
          const raw = event.target.value.trim()
          onValueChange(raw === "" ? null : parseMoneyInput(raw))
        }}
        onBlur={(event) => {
          setDraft(null)
          onBlur?.(event)
        }}
      />
    </InputGroup>
  )
}

const percentText = (ratio: number) =>
  String(Math.round(ratio * 100 * 10 ** PERCENT_DIGITS) / 10 ** PERCENT_DIGITS)

export function PercentInput({
  value,
  onValueChange,
  onBlur,
  ...props
}: BaseProps) {
  const { text, setDraft } = useDraft(value, percentText)
  return (
    <InputGroup>
      <InputGroupInput
        {...props}
        inputMode="decimal"
        autoComplete="off"
        className="num"
        value={text}
        onChange={(event) => {
          setDraft(event.target.value)
          const raw = event.target.value.trim()
          onValueChange(raw === "" ? null : parsePercentInput(raw))
        }}
        onBlur={(event) => {
          setDraft(null)
          onBlur?.(event)
        }}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>%</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}

export function MonthsInput({
  value,
  onValueChange,
  onBlur,
  ...props
}: BaseProps) {
  const { text, setDraft } = useDraft(value, String)
  return (
    <InputGroup>
      <InputGroupInput
        {...props}
        inputMode="numeric"
        autoComplete="off"
        className="num"
        value={text}
        onChange={(event) => {
          const raw = event.target.value.replace(/[^\d]/g, "")
          setDraft(raw)
          onValueChange(raw === "" ? null : Number(raw))
        }}
        onBlur={(event) => {
          setDraft(null)
          onBlur?.(event)
        }}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{value === 1 ? "month" : "months"}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}
