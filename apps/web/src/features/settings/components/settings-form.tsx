"use client"

import { useState, useTransition, type ReactNode } from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { Switch } from "@workspace/ui/components/switch"

import { FormField } from "@/components/blocks/form-field"
import {
  MoneyInput,
  MonthsInput,
  PercentInput,
} from "@/components/blocks/numeric-inputs"
import { OptionSelect } from "@/components/blocks/option-select"
import { zodFieldErrors, type FieldErrors } from "@/lib/errors"
import { updateSettings } from "../actions"
import {
  settingsSchema,
  type BuyBox,
  type DealDefaults,
  type WorkspaceSettings,
} from "../schemas"

/** Numbers are null while a field is being retyped; saving validates them. */
type Draft = WorkspaceSettings

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-base">{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">{children}</CardContent>
    </Card>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

type NumberKind = "money" | "percent" | "months"
const INPUTS = {
  money: MoneyInput,
  percent: PercentInput,
  months: MonthsInput,
} as const

function NumberSetting({
  id,
  kind,
  label,
  description,
  value,
  onChange,
  errors,
}: {
  id: string
  kind: NumberKind
  label: string
  description?: string
  value: number | null
  onChange: (v: number | null) => void
  errors: FieldErrors
}) {
  const Control = INPUTS[kind]
  const error = errors[id]
  return (
    <FormField id={id} label={label} description={description} error={error}>
      <Control
        id={id}
        value={value}
        onValueChange={onChange}
        aria-invalid={!!error}
      />
    </FormField>
  )
}

function SwitchSetting({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <Field orientation="horizontal" className="sm:col-span-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <FieldLabel htmlFor={id} className="font-normal">
        {label}
      </FieldLabel>
    </Field>
  )
}

export function SettingsForm({ initial }: { initial: WorkspaceSettings }) {
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState<Draft>(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [pending, startTransition] = useTransition()
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  const setBox = (patch: Partial<BuyBox>) =>
    setDraft((d) => ({ ...d, buyBox: { ...d.buyBox, ...patch } }))
  const setDefaults = <K extends keyof DealDefaults>(
    section: K,
    patch: Partial<DealDefaults[K]>
  ) =>
    setDraft((d) => ({
      ...d,
      defaults: {
        ...d.defaults,
        [section]: { ...d.defaults[section], ...patch },
      },
    }))
  // Shorthand for number fields: keyed by the settings path, so errors line up.
  const num = (
    id: string,
    kind: NumberKind,
    label: string,
    value: number,
    onChange: (v: number) => void,
    description?: string
  ) => (
    <NumberSetting
      id={id}
      kind={kind}
      label={label}
      description={description}
      value={value as number | null}
      // Keep null while retyping; validation on save catches empty fields.
      onChange={(v) => onChange(v as number)}
      errors={errors}
    />
  )

  const save = () => {
    const parsed = settingsSchema.safeParse(draft)
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error))
      toast.error("Some fields need a number.")
      return
    }
    setErrors({})
    startTransition(async () => {
      const result = await updateSettings(parsed.data)
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.message)
        return
      }
      setSaved(parsed.data)
      setDraft(parsed.data)
      toast.success("Settings saved. Your deals have been updated.")
    })
  }

  const { buyBox: box, defaults: d } = draft

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <Section
        title="Buy box"
        description="What a deal needs to show to get Stacks. Missing a target by less than the margin counts as Marginal."
      >
        <Group title="Selling">
          {num(
            "buyBox.minFlipProfitPence",
            "money",
            "Minimum profit",
            box.minFlipProfitPence,
            (v) => setBox({ minFlipProfitPence: v })
          )}
          {num(
            "buyBox.minFlipRoi",
            "percent",
            "Minimum return on cash",
            box.minFlipRoi,
            (v) => setBox({ minFlipRoi: v }),
            "0% judges the sale on profit alone."
          )}
        </Group>
        <Group title="Keeping it (BRR plans only)">
          {num(
            "buyBox.maxMoneyLeftInPence",
            "money",
            "Most money left in",
            box.maxMoneyLeftInPence,
            (v) => setBox({ maxMoneyLeftInPence: v })
          )}
          {num(
            "buyBox.minMonthlyCashflowPence",
            "money",
            "Least monthly cashflow",
            box.minMonthlyCashflowPence,
            (v) => setBox({ minMonthlyCashflowPence: v })
          )}
        </Group>
        <Group title="Marginal">
          {num(
            "buyBox.marginalTolerance",
            "percent",
            "Near-miss margin",
            box.marginalTolerance,
            (v) => setBox({ marginalTolerance: v }),
            "e.g. 10%: £18,000 against a £20,000 target is Marginal."
          )}
        </Group>
      </Section>

      <Section
        title="You"
        description="Who's buying. Sets stamp duty, tax and each new deal's default plan."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="buyerEntity" label="Buying as">
            <OptionSelect
              id="buyerEntity"
              value={draft.buyerEntity}
              onValueChange={(v) => setDraft((x) => ({ ...x, buyerEntity: v }))}
              options={{ personal: "Personal name", ltd: "Limited company" }}
            />
          </FormField>
          <SwitchSetting
            id="firstTimeBuyer"
            label="First-time buyers"
            checked={d.buyer.firstTimeBuyer}
            onChange={(v) => setDefaults("buyer", { firstTimeBuyer: v })}
          />
        </div>
      </Section>

      <Section
        title="Default assumptions"
        description="Every deal uses these until you change that number on the deal. Changing one here updates those deals too."
      >
        <Group title="Buying">
          {num(
            "defaults.finance.purchaseLtv",
            "percent",
            "Mortgage LTV",
            d.finance.purchaseLtv,
            (v) => setDefaults("finance", { purchaseLtv: v }),
            "95% means a 5% deposit."
          )}
          {num(
            "defaults.purchase.monthsToComplete",
            "months",
            "Months to complete",
            d.purchase.monthsToComplete,
            (v) => setDefaults("purchase", { monthsToComplete: v })
          )}
          {num(
            "defaults.purchase.legalPence",
            "money",
            "Legal fees",
            d.purchase.legalPence,
            (v) => setDefaults("purchase", { legalPence: v })
          )}
          {num(
            "defaults.purchase.surveyPence",
            "money",
            "Survey",
            d.purchase.surveyPence,
            (v) => setDefaults("purchase", { surveyPence: v })
          )}
        </Group>
        <Group title="Refurb">
          {num(
            "defaults.refurb.months",
            "months",
            "Refurb time",
            d.refurb.months,
            (v) => setDefaults("refurb", { months: v })
          )}
          {num(
            "defaults.refurb.contingency",
            "percent",
            "Contingency",
            d.refurb.contingency,
            (v) => setDefaults("refurb", { contingency: v }),
            "Added on top of your refurb cost."
          )}
        </Group>
        <Group title="Monthly costs while you own it">
          {num(
            "defaults.holding.councilTaxMonthlyPence",
            "money",
            "Council tax",
            d.holding.councilTaxMonthlyPence,
            (v) => setDefaults("holding", { councilTaxMonthlyPence: v })
          )}
          {num(
            "defaults.holding.utilitiesMonthlyPence",
            "money",
            "Utilities",
            d.holding.utilitiesMonthlyPence,
            (v) => setDefaults("holding", { utilitiesMonthlyPence: v })
          )}
          {num(
            "defaults.holding.insuranceMonthlyPence",
            "money",
            "Insurance",
            d.holding.insuranceMonthlyPence,
            (v) => setDefaults("holding", { insuranceMonthlyPence: v })
          )}
        </Group>
        <Group title="Selling">
          {num(
            "defaults.flip.monthsToSell",
            "months",
            "Months to sell (after refurb)",
            d.flip.monthsToSell,
            (v) => setDefaults("flip", { monthsToSell: v })
          )}
          {num(
            "defaults.flip.agentFee",
            "percent",
            "Estate agent fee",
            d.flip.agentFee,
            (v) => setDefaults("flip", { agentFee: v })
          )}
          <SwitchSetting
            id="agentFeeVat"
            label="Add VAT to the agent fee"
            checked={d.flip.agentFeeVat}
            onChange={(v) => setDefaults("flip", { agentFeeVat: v })}
          />
          {num(
            "defaults.flip.saleLegalPence",
            "money",
            "Legal fees on sale",
            d.flip.saleLegalPence,
            (v) => setDefaults("flip", { saleLegalPence: v })
          )}
          {num(
            "defaults.flip.otherIncomePence",
            "money",
            "Your other taxable income",
            d.flip.otherIncomePence,
            (v) => setDefaults("flip", { otherIncomePence: v }),
            "Only used when the sale is taxed (not a main residence)."
          )}
        </Group>
        <Group title="Keeping it (BRR plans only)">
          {num(
            "defaults.keep.refinanceLtv",
            "percent",
            "Refinance LTV",
            d.keep.refinanceLtv,
            (v) => setDefaults("keep", { refinanceLtv: v })
          )}
          {num(
            "defaults.keep.grossYield",
            "percent",
            "Gross yield",
            d.keep.grossYield,
            (v) => setDefaults("keep", { grossYield: v }),
            "Estimates rent from the end value until you enter a rent."
          )}
          {num(
            "defaults.keep.management",
            "percent",
            "Letting management",
            d.keep.management,
            (v) => setDefaults("keep", { management: v })
          )}
          {num("defaults.keep.voids", "percent", "Voids", d.keep.voids, (v) =>
            setDefaults("keep", { voids: v })
          )}
          {num(
            "defaults.keep.maintenance",
            "percent",
            "Maintenance",
            d.keep.maintenance,
            (v) => setDefaults("keep", { maintenance: v })
          )}
        </Group>
      </Section>

      <Section
        title="Finance products"
        description="Mortgage rates change often. Products not reviewed for this long are flagged as stale."
      >
        <FormField
          id="staleAfterDays"
          label="Flag as stale after (days)"
          error={errors.staleAfterDays}
        >
          <Input
            id="staleAfterDays"
            type="number"
            inputMode="numeric"
            min={1}
            max={3650}
            className="num sm:max-w-40"
            value={
              Number.isFinite(draft.staleAfterDays) ? draft.staleAfterDays : ""
            }
            onChange={(e) =>
              setDraft((x) => ({
                ...x,
                staleAfterDays:
                  e.target.value === "" ? Number.NaN : Number(e.target.value),
              }))
            }
            aria-invalid={!!errors.staleAfterDays}
          />
        </FormField>
      </Section>

      {/* Pinned save bar: above the phone tab bar, bottom of the page on desktop. */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:rounded-lg md:border">
        <p
          className="min-w-0 flex-1 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {dirty ? "Unsaved changes" : "All changes saved"}
        </p>
        {dirty ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraft(saved)
              setErrors({})
            }}
          >
            Discard
          </Button>
        ) : null}
        <Button type="submit" disabled={!dirty || pending}>
          {pending ? <Spinner /> : null}
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  )
}
