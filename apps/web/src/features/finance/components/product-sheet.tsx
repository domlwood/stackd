"use client"

import { useTransition, type ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
} from "react-hook-form"
import { ArchiveIcon, ArchiveRestoreIcon, CheckCheckIcon } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import { FormField } from "@/components/blocks/form-field"
import {
  MoneyInput,
  MonthsInput,
  PercentInput,
} from "@/components/blocks/numeric-inputs"
import { OptionSelect } from "@/components/blocks/option-select"
import { ResponsiveSheet } from "@/components/blocks/responsive-sheet"
import { formatRelative } from "@/lib/format/date"
import { applyServerFieldErrors } from "@/lib/forms"
import {
  archiveFinanceProduct,
  markProductReviewed,
  restoreFinanceProduct,
  saveFinanceProduct,
} from "../actions"
import type { ProductListItem } from "../queries"
import {
  INTEREST_MODE_LABELS,
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPES,
  emptyProduct,
  financeProductSchema,
  normaliseForType,
  type FinanceProductInput,
  type ProductType,
} from "../schemas"
import { ErcScheduleEditor } from "./erc-schedule-editor"
import { StaleBadge } from "./stale-badge"

const FORM_ID = "finance-product-form"

type NumericField = Exclude<
  {
    [K in keyof FinanceProductInput]-?: FinanceProductInput[K] extends
      number | null
      ? K
      : never
  }[keyof FinanceProductInput],
  undefined
>

type FieldProps = {
  control: Control<FinanceProductInput>
  errors: FieldErrors<FinanceProductInput>
  name: NumericField
  label: string
  description?: ReactNode
}

function NumberField({
  kind,
  control,
  errors,
  name,
  label,
  description,
}: FieldProps & { kind: "percent" | "money" | "months" }) {
  const id = `product-${name}`
  const Input =
    kind === "percent"
      ? PercentInput
      : kind === "money"
        ? MoneyInput
        : MonthsInput
  const error = errors[name]?.message
  return (
    <FormField id={id} label={label} error={error} description={description}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Input
            id={id}
            value={field.value as number | null}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            aria-invalid={!!error}
          />
        )}
      />
    </FormField>
  )
}

function toFormValues(
  product: ProductListItem | null,
  type: ProductType
): FinanceProductInput {
  if (!product) return emptyProduct(type)
  const {
    staleness: _s,
    usedBy: _u,
    lastReviewedAt: _l,
    archivedAt: _a,
    updatedAt: _up,
    ...input
  } = product
  return input
}

type ProductSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductListItem | null
  initialType: ProductType
  onOptimistic: (patch: {
    id: string
    archivedAt?: string | null
    reviewed?: boolean
  }) => void
}

export function ProductSheet({
  open,
  onOpenChange,
  product,
  initialType,
  onOptimistic,
}: ProductSheetProps) {
  const [pending, startTransition] = useTransition()
  const form = useForm<FinanceProductInput>({
    resolver: zodResolver(financeProductSchema),
    values: toFormValues(product, initialType),
  })
  const { control, formState, register } = form
  const { errors } = formState
  const type = useWatch({ control, name: "type" })
  const rateType = useWatch({ control, name: "rateType" })
  const feeKind = useWatch({ control, name: "arrangementFeeKind" })
  const bands = useWatch({ control, name: "ercBands" })
  const mortgage = type === "residential" || type === "btl"

  const changeType = (next: ProductType) => {
    if (product) {
      form.setValue("type", next, { shouldDirty: true })
      return
    }
    const current = form.getValues()
    form.reset({
      ...emptyProduct(next),
      lender: next === "cash" ? "Own funds" : current.lender,
      name: next === "cash" ? "Cash purchase" : current.name,
    })
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveFinanceProduct(normaliseForType(values))
      if (!result.ok) {
        applyServerFieldErrors(form.setError, result.fieldErrors)
        toast.error(result.message)
        return
      }
      toast.success(product ? "Product updated" : "Product added")
      onOpenChange(false)
    })
  })

  const runLifecycle = (kind: "archive" | "restore" | "review") => {
    if (!product) return
    startTransition(async () => {
      if (kind === "review") onOptimistic({ id: product.id, reviewed: true })
      else
        onOptimistic({
          id: product.id,
          archivedAt: kind === "archive" ? new Date().toISOString() : null,
        })
      const action =
        kind === "archive"
          ? archiveFinanceProduct
          : kind === "restore"
            ? restoreFinanceProduct
            : markProductReviewed
      const result = await action(product.id)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      if (kind === "archive") {
        onOpenChange(false)
        toast.success(`Archived “${product.name}”`, {
          action: {
            label: "Undo",
            onClick: () => void restoreFinanceProduct(product.id),
          },
        })
      } else {
        toast.success(
          kind === "restore" ? "Product restored" : "Marked as reviewed today"
        )
      }
    })
  }

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        product ? `${product.lender} · ${product.name}` : "Add finance product"
      }
      description={
        product
          ? `${PRODUCT_TYPE_LABELS[product.type]} product`
          : "A reusable set of lending terms you can attach to deals."
      }
      footer={
        <>
          {product ? (
            product.archivedAt ? (
              <Button
                variant="outline"
                className="mr-auto"
                disabled={pending}
                onClick={() => runLifecycle("restore")}
              >
                <ArchiveRestoreIcon aria-hidden />
                <span className="max-sm:sr-only">Restore</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="mr-auto"
                disabled={pending}
                onClick={() => runLifecycle("archive")}
              >
                <ArchiveIcon aria-hidden />
                <span className="max-sm:sr-only">Archive</span>
              </Button>
            )
          ) : null}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={pending}
            className="max-sm:flex-1"
          >
            {pending ? <Spinner /> : null}
            Save
          </Button>
        </>
      }
    >
      {product ? (
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Reviewed {formatRelative(product.lastReviewedAt)}</span>
            <StaleBadge staleness={product.staleness} />
            <Button
              size="sm"
              variant="secondary"
              className="ml-auto"
              disabled={pending}
              onClick={() => runLifecycle("review")}
            >
              <CheckCheckIcon aria-hidden />
              Terms still current
            </Button>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <div className="font-medium">Used by</div>
            {product.usedBy.length === 0 ? (
              <p className="text-muted-foreground">
                Not used by any deals yet.
              </p>
            ) : (
              <ul className="mt-1 list-inside list-disc">
                {product.usedBy.map((deal) => (
                  <li key={deal.dealId}>{deal.label}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <form id={FORM_ID} onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <Field>
            <FieldLabel id="product-type-label">Type</FieldLabel>
            <ToggleGroup
              aria-labelledby="product-type-label"
              variant="outline"
              className="grid w-full grid-cols-2 sm:grid-cols-4"
              value={[type]}
              onValueChange={(value: string[]) => {
                const next = value[0] as ProductType | undefined
                if (next) changeType(next)
              }}
            >
              {PRODUCT_TYPES.map((t) => (
                <ToggleGroupItem key={t} value={t} className="w-full">
                  {PRODUCT_TYPE_LABELS[t]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="product-lender"
              label="Lender"
              error={errors.lender?.message}
            >
              <Input
                id="product-lender"
                aria-invalid={!!errors.lender}
                {...register("lender")}
              />
            </FormField>
            <FormField
              id="product-name"
              label="Product name"
              error={errors.name?.message}
            >
              <Input
                id="product-name"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
            </FormField>
          </div>

          {mortgage ? (
            <FieldSet>
              <FieldLegend>Mortgage terms</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  kind="percent"
                  control={control}
                  errors={errors}
                  name="rate"
                  label="Interest rate (annual)"
                />
                <FormField
                  id="product-rateType"
                  label="Rate type"
                  error={errors.rateType?.message}
                >
                  <Controller
                    control={control}
                    name="rateType"
                    render={({ field }) => (
                      <OptionSelect
                        id="product-rateType"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={{ fixed: "Fixed", tracker: "Tracker" }}
                      />
                    )}
                  />
                </FormField>
                {rateType === "fixed" ? (
                  <NumberField
                    kind="months"
                    control={control}
                    errors={errors}
                    name="fixedMonths"
                    label="Fixed period"
                  />
                ) : null}
                <NumberField
                  kind="months"
                  control={control}
                  errors={errors}
                  name="termMonths"
                  label="Term"
                  description="e.g. 300 months = 25 years"
                />
                <FormField
                  id="product-repayment"
                  label="Repayment"
                  error={errors.repayment?.message}
                >
                  <Controller
                    control={control}
                    name="repayment"
                    render={({ field }) => (
                      <OptionSelect
                        id="product-repayment"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={{
                          repayment: "Capital repayment",
                          interest_only: "Interest only",
                        }}
                      />
                    )}
                  />
                </FormField>
                <NumberField
                  kind="percent"
                  control={control}
                  errors={errors}
                  name="maxLtv"
                  label="Maximum LTV"
                />
              </div>
            </FieldSet>
          ) : null}

          {type === "bridging" ? (
            <FieldSet>
              <FieldLegend>Bridging terms</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  kind="percent"
                  control={control}
                  errors={errors}
                  name="monthlyRate"
                  label="Monthly rate"
                />
                <FormField
                  id="product-interestMode"
                  label="Interest"
                  error={errors.interestMode?.message}
                >
                  <Controller
                    control={control}
                    name="interestMode"
                    render={({ field }) => (
                      <OptionSelect
                        id="product-interestMode"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={INTEREST_MODE_LABELS}
                      />
                    )}
                  />
                </FormField>
                <NumberField
                  kind="months"
                  control={control}
                  errors={errors}
                  name="minTermMonths"
                  label="Minimum interest period"
                />
                <NumberField
                  kind="months"
                  control={control}
                  errors={errors}
                  name="termMonths"
                  label="Maximum term"
                />
                <NumberField
                  kind="percent"
                  control={control}
                  errors={errors}
                  name="maxLtv"
                  label="Maximum LTV"
                />
                <NumberField
                  kind="percent"
                  control={control}
                  errors={errors}
                  name="exitFeePct"
                  label="Exit fee"
                />
              </div>
            </FieldSet>
          ) : null}

          {type === "btl" ? (
            <FieldSet>
              <FieldLegend>Rental affordability</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  kind="percent"
                  control={control}
                  errors={errors}
                  name="stressRate"
                  label="Stress rate"
                  description="The rate the lender tests rent against."
                />
                <NumberField
                  kind="percent"
                  control={control}
                  errors={errors}
                  name="icrThreshold"
                  label="ICR threshold"
                  description="e.g. 125% basic rate, 145% higher rate."
                />
                <NumberField
                  kind="months"
                  control={control}
                  errors={errors}
                  name="minMonthsOwnedForRevaluation"
                  label="Months owned before revaluation"
                  description="Many lenders won't use a new valuation within 6 months of purchase."
                />
              </div>
            </FieldSet>
          ) : null}

          {type !== "cash" ? (
            <>
              <FieldSeparator />
              <FieldSet>
                <FieldLegend>Fees</FieldLegend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField id="product-feeKind" label="Arrangement fee">
                    <Controller
                      control={control}
                      name="arrangementFeeKind"
                      render={({ field }) => (
                        <OptionSelect
                          id="product-feeKind"
                          value={field.value}
                          onValueChange={field.onChange}
                          options={{ fixed: "Fixed amount", pct: "% of loan" }}
                        />
                      )}
                    />
                  </FormField>
                  {feeKind === "fixed" ? (
                    <NumberField
                      kind="money"
                      control={control}
                      errors={errors}
                      name="arrangementFeePence"
                      label="Fee amount"
                    />
                  ) : (
                    <NumberField
                      kind="percent"
                      control={control}
                      errors={errors}
                      name="arrangementFeePct"
                      label="Fee %"
                    />
                  )}
                  <NumberField
                    kind="money"
                    control={control}
                    errors={errors}
                    name="brokerFeePence"
                    label="Broker fee"
                  />
                  <NumberField
                    kind="money"
                    control={control}
                    errors={errors}
                    name="valuationFeePence"
                    label="Valuation fee"
                  />
                </div>
                <Controller
                  control={control}
                  name="feeAddedToLoan"
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <Switch
                        id="product-feeAdded"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <FieldLabel
                        htmlFor="product-feeAdded"
                        className="font-normal"
                      >
                        Arrangement fee added to the loan
                      </FieldLabel>
                    </Field>
                  )}
                />
              </FieldSet>
              <FieldSeparator />
              <ErcScheduleEditor
                control={control}
                errors={errors.ercBands}
                bands={bands}
              />
            </>
          ) : (
            <Alert>
              <AlertDescription>
                Cash purchases have no lending terms. Fees and ERCs don&apos;t
                apply.
              </AlertDescription>
            </Alert>
          )}

          <FormField
            id="product-notes"
            label="Notes"
            error={errors.notes?.message}
            description="Optional: source, broker contact, conditions."
          >
            <Textarea id="product-notes" rows={3} {...register("notes")} />
          </FormField>
        </FieldGroup>
      </form>
    </ResponsiveSheet>
  )
}
