"use client"

/**
 * ErcScheduleEditor — field array of contiguous ERC bands [from, to) in months.
 * "Add band" continues from the last band; errors show per row.
 */
import {
  Controller,
  useFieldArray,
  type Control,
  type FieldErrors,
} from "react-hook-form"
import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"

import { MonthsInput, PercentInput } from "@/components/blocks/numeric-inputs"
import { formatPercent } from "@/lib/format/percent"
import {
  MAX_ERC_BANDS,
  nextErcBand,
  type ErcBand,
  type FinanceProductInput,
} from "../schemas"

const MONTHS_PER_YEAR = 12

export function describeBand(band: ErcBand): string {
  const span =
    band.fromMonth % MONTHS_PER_YEAR === 0 &&
    band.toMonth % MONTHS_PER_YEAR === 0
      ? band.toMonth - band.fromMonth === MONTHS_PER_YEAR
        ? `Year ${band.toMonth / MONTHS_PER_YEAR}`
        : `Years ${band.fromMonth / MONTHS_PER_YEAR + 1}–${band.toMonth / MONTHS_PER_YEAR}`
      : `Months ${band.fromMonth + 1}–${band.toMonth}`
  return `${span}: ${formatPercent(band.pct, 2)}`
}

type Props = {
  control: Control<FinanceProductInput>
  errors: FieldErrors<FinanceProductInput>["ercBands"]
  bands: ErcBand[]
}

export function ErcScheduleEditor({ control, errors, bands }: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "ercBands",
  })
  const rootError = errors?.root?.message ?? errors?.message

  return (
    <FieldSet>
      <FieldLegend variant="label">Early repayment charges</FieldLegend>
      <FieldDescription>
        Charged as a % of the balance if you redeem in that period (e.g. selling
        or refinancing). Leave empty if there are none.
      </FieldDescription>

      {fields.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div
            className="grid grid-cols-[1fr_1fr_1fr_2.5rem] gap-2 text-xs text-muted-foreground"
            aria-hidden
          >
            <span>From month</span>
            <span>To month</span>
            <span>Charge</span>
            <span />
          </div>
          {fields.map((field, index) => {
            const rowErrors = errors?.[index]
            const message =
              rowErrors?.fromMonth?.message ??
              rowErrors?.toMonth?.message ??
              rowErrors?.pct?.message
            const band = bands[index]
            return (
              <div key={field.id} className="flex flex-col gap-1">
                <div className="grid grid-cols-[1fr_1fr_1fr_2.5rem] items-center gap-2">
                  <Controller
                    control={control}
                    name={`ercBands.${index}.fromMonth`}
                    render={({ field: f }) => (
                      <MonthsInput
                        aria-label={`Band ${index + 1} from month`}
                        value={f.value}
                        onValueChange={(v) => f.onChange(v ?? 0)}
                        aria-invalid={!!rowErrors?.fromMonth}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`ercBands.${index}.toMonth`}
                    render={({ field: f }) => (
                      <MonthsInput
                        aria-label={`Band ${index + 1} to month`}
                        value={f.value}
                        onValueChange={(v) => f.onChange(v ?? 0)}
                        aria-invalid={!!rowErrors?.toMonth}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`ercBands.${index}.pct`}
                    render={({ field: f }) => (
                      <PercentInput
                        aria-label={`Band ${index + 1} charge`}
                        value={f.value}
                        onValueChange={(v) => f.onChange(v ?? 0)}
                        aria-invalid={!!rowErrors?.pct}
                      />
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove band ${index + 1}`}
                    onClick={() => remove(index)}
                  >
                    <Trash2Icon aria-hidden />
                  </Button>
                </div>
                {message ? (
                  <p role="alert" className="text-sm text-destructive">
                    {message}
                  </p>
                ) : band ? (
                  <p className="text-xs text-muted-foreground">
                    {describeBand(band)}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

      {rootError ? (
        <p role="alert" className="text-sm text-destructive">
          {rootError}
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={fields.length >= MAX_ERC_BANDS}
        onClick={() => append(nextErcBand(bands))}
      >
        <PlusIcon aria-hidden />
        Add band
      </Button>
    </FieldSet>
  )
}
