"use client"

/**
 * OptionSelect — typed single-select over a fixed label map.
 *
 * Props: id, value, onValueChange, options (Record<value, label>), placeholder?, aria-invalid?, disabled?
 * Usage:
 *   <OptionSelect id="kind" value={kind} onValueChange={setKind} options={FUND_POT_KIND_LABELS} />
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

type OptionSelectProps<V extends string> = {
  id: string
  value: V | null
  onValueChange: (value: V) => void
  options: Record<V, string>
  placeholder?: string
  disabled?: boolean
  "aria-invalid"?: boolean
}

export function OptionSelect<V extends string>({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Choose…",
  disabled,
  "aria-invalid": invalid,
}: OptionSelectProps<V>) {
  const entries = Object.entries(options) as [V, string][]
  return (
    <Select
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next as V)
      }}
    >
      <SelectTrigger
        id={id}
        aria-invalid={invalid || undefined}
        className="w-full"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {entries.map(([optionValue, label]) => (
          <SelectItem key={optionValue} value={optionValue}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
