"use client"

import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { FieldGroup } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

import { FormField } from "@/components/blocks/form-field"
import { MoneyInput } from "@/components/blocks/numeric-inputs"
import { OptionSelect } from "@/components/blocks/option-select"
import { SQFT_PER_SQM } from "@/lib/calc/refurb"
import { applyServerFieldErrors } from "@/lib/forms"
import {
  dealDetailsSchema,
  PROPERTY_TYPE_LABELS,
  TENURE_LABELS,
  type DealDetails,
  type DealDetailsInput,
} from "../schemas"
import type { Deal } from "../types"

export const EMPTY_DETAILS: DealDetailsInput = {
  addressLine: "",
  postcode: "",
  propertyType: null,
  tenure: null,
  beds: null,
  baths: null,
  floorAreaSqm: null,
  askingPricePence: null,
  listingUrl: "",
  agent: "",
  description: "",
}

export function dealToDetails(deal: Deal): DealDetailsInput {
  return {
    addressLine: deal.addressLine,
    postcode: deal.postcode ?? "",
    propertyType: deal.propertyType,
    tenure: deal.tenure,
    beds: deal.beds,
    baths: deal.baths,
    floorAreaSqm: deal.floorAreaSqm,
    askingPricePence: deal.askingPricePence,
    listingUrl: deal.listingUrl ?? "",
    agent: deal.agent ?? "",
    description: deal.description ?? "",
  }
}

const toIntOrNull = (raw: string) =>
  raw.trim() === "" ? null : Number.parseInt(raw, 10)
const toNumOrNull = (raw: string) => (raw.trim() === "" ? null : Number(raw))

type Props = {
  initial: DealDetailsInput
  submitLabel: string
  onSubmit: (
    values: DealDetails
  ) => Promise<
    | { ok: true }
    | { ok: false; message: string; fieldErrors?: Record<string, string> }
  >
}

/** Property facts. Used for manual deal creation and the Listing tab. */
export function DealDetailsForm({ initial, submitLabel, onSubmit }: Props) {
  const [pending, startTransition] = useTransition()
  const form = useForm<DealDetailsInput, unknown, DealDetails>({
    resolver: zodResolver(dealDetailsSchema),
    defaultValues: initial,
  })
  const { errors } = form.formState
  const area = useWatch({ control: form.control, name: "floorAreaSqm" })

  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await onSubmit(values)
      if (!result.ok) {
        applyServerFieldErrors(form.setError, result.fieldErrors)
        toast.error(result.message)
      }
    })
  )

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <FormField
          id="deal-address"
          label="Address"
          error={errors.addressLine?.message}
        >
          <Input
            id="deal-address"
            autoComplete="street-address"
            aria-invalid={!!errors.addressLine}
            {...form.register("addressLine")}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            id="deal-postcode"
            label="Postcode"
            error={errors.postcode?.message}
          >
            <Input
              id="deal-postcode"
              autoComplete="postal-code"
              autoCapitalize="characters"
              aria-invalid={!!errors.postcode}
              {...form.register("postcode")}
            />
          </FormField>
          <FormField
            id="deal-price"
            label="Asking price"
            error={errors.askingPricePence?.message}
          >
            <Controller
              control={form.control}
              name="askingPricePence"
              render={({ field }) => (
                <MoneyInput
                  id="deal-price"
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </FormField>
          <FormField id="deal-type" label="Property type">
            <Controller
              control={form.control}
              name="propertyType"
              render={({ field }) => (
                <OptionSelect
                  id="deal-type"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={PROPERTY_TYPE_LABELS}
                />
              )}
            />
          </FormField>
          <FormField id="deal-tenure" label="Tenure">
            <Controller
              control={form.control}
              name="tenure"
              render={({ field }) => (
                <OptionSelect
                  id="deal-tenure"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={TENURE_LABELS}
                />
              )}
            />
          </FormField>
          <FormField
            id="deal-beds"
            label="Bedrooms"
            error={errors.beds?.message}
          >
            <Controller
              control={form.control}
              name="beds"
              render={({ field }) => (
                <Input
                  id="deal-beds"
                  inputMode="numeric"
                  className="num"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(toIntOrNull(e.target.value))}
                />
              )}
            />
          </FormField>
          <FormField
            id="deal-baths"
            label="Bathrooms"
            error={errors.baths?.message}
          >
            <Controller
              control={form.control}
              name="baths"
              render={({ field }) => (
                <Input
                  id="deal-baths"
                  inputMode="numeric"
                  className="num"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(toIntOrNull(e.target.value))}
                />
              )}
            />
          </FormField>
        </div>
        <FormField
          id="deal-area"
          label="Floor area (m²)"
          error={errors.floorAreaSqm?.message}
          description={
            area
              ? `≈ ${Math.round(Number(area) * SQFT_PER_SQM).toLocaleString("en-GB")} sq ft`
              : "From the floor plan or EPC, if known."
          }
        >
          <Controller
            control={form.control}
            name="floorAreaSqm"
            render={({ field }) => (
              <Input
                id="deal-area"
                inputMode="decimal"
                className="num"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(toNumOrNull(e.target.value))}
              />
            )}
          />
        </FormField>
        <FormField
          id="deal-url"
          label="Listing link"
          error={errors.listingUrl?.message}
        >
          <Input
            id="deal-url"
            type="url"
            inputMode="url"
            placeholder="https://"
            aria-invalid={!!errors.listingUrl}
            {...form.register("listingUrl")}
          />
        </FormField>
        <FormField id="deal-agent" label="Agent">
          <Input id="deal-agent" {...form.register("agent")} />
        </FormField>
        <FormField id="deal-description" label="Description">
          <Textarea
            id="deal-description"
            rows={4}
            {...form.register("description")}
          />
        </FormField>
        <Button
          type="submit"
          disabled={pending}
          className="self-start max-sm:w-full"
        >
          {pending ? <Spinner /> : null}
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  )
}
