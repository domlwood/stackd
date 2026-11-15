import { z } from "zod"

import type { BuyerEntity, Pence, Ratio, TaxMode } from "@/lib/calc/types"

/**
 * Every editable deal input, by key. Each input is a sourced, owned value
 * (stored in deal_input). Keys are stable: they're referenced by figures,
 * threads and activity. Refurb line costs use the dynamic key `refurb_item:{id}.cost`.
 */

export type InputKind =
  "money" | "ratio" | "months" | "boolean" | "enum" | "date" | "product"

export type InputSection =
  | "buyer"
  | "purchase"
  | "finance"
  | "refurb"
  | "holding"
  | "exit"
  | "flip"
  | "keep"

/** What defaults are computed from (workspace settings + facts about the deal). */
export type DefaultsSource = {
  buyerEntity: BuyerEntity
  today: string
  deal: { askingPricePence: Pence | null; suggestedGdvPence: Pence | null }
  defaults: {
    buyer: {
      additionalProperty: boolean
      nonResident: boolean
      corporateRelief: boolean
    }
    purchase: {
      legalPence: Pence
      surveyPence: Pence
      sourcingPence: Pence
      otherPence: Pence
      monthsToComplete: number
    }
    finance: { purchaseLtv: Ratio }
    refurb: { contingency: Ratio; months: number }
    holding: {
      councilTaxMonthlyPence: Pence
      utilitiesMonthlyPence: Pence
      insuranceMonthlyPence: Pence
      otherMonthlyPence: Pence
    }
    flip: {
      agentFee: Ratio
      agentFeeVat: boolean
      saleLegalPence: Pence
      monthsToSell: number
      otherIncomePence: Pence
    }
    keep: {
      refinanceLtv: Ratio
      management: Ratio
      voids: Ratio
      maintenance: Ratio
      insuranceMonthlyPence: Pence
      groundRentServiceMonthlyPence: Pence
      otherMonthlyPence: Pence
      refinanceLegalPence: Pence
    }
  }
}

export type InputDef<T = unknown> = {
  key: string
  label: string
  section: InputSection
  kind: InputKind
  description?: string
  options?: Record<string, string>
  schema: z.ZodType<T>
  defaultValue: (source: DefaultsSource) => T
}

const money = z.number().int().nonnegative()
const ratio = z.number().min(0).max(1)
const months = z.number().int().min(0).max(120)
const productId = z.uuid().nullable()
const isoDate = z.iso.date()

const TAX_MODE_OPTIONS: Record<TaxMode, string> = {
  income_tax: "Income tax (trading)",
  cgt: "Capital gains tax",
  corp_tax: "Corporation tax",
}

function addMonths(isoDay: string, count: number): string {
  const date = new Date(`${isoDay}T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + count)
  return date.toISOString().slice(0, 10)
}

function def<T>(d: InputDef<T>): InputDef<T> {
  return d
}

export const INPUT_DEFS = [
  // Buyer
  def({
    key: "buyer.entity",
    label: "Buying as",
    section: "buyer",
    kind: "enum",
    options: { personal: "Personal name", ltd: "Limited company" },
    schema: z.enum(["personal", "ltd"]),
    defaultValue: (s) => s.buyerEntity,
  }),
  def({
    key: "buyer.additionalProperty",
    label: "Additional property (higher-rate SDLT)",
    section: "buyer",
    kind: "boolean",
    schema: z.boolean(),
    defaultValue: (s) => s.defaults.buyer.additionalProperty,
  }),
  def({
    key: "buyer.nonResident",
    label: "Non-UK resident buyer",
    section: "buyer",
    kind: "boolean",
    schema: z.boolean(),
    defaultValue: (s) => s.defaults.buyer.nonResident,
  }),
  def({
    key: "buyer.corporateRelief",
    label: "Company relief from 17% flat rate",
    section: "buyer",
    kind: "boolean",
    description:
      "e.g. property rental business relief. Only matters for companies buying over £500k.",
    schema: z.boolean(),
    defaultValue: (s) => s.defaults.buyer.corporateRelief,
  }),

  // Purchase
  def({
    key: "purchase.price",
    label: "Purchase price",
    section: "purchase",
    kind: "money",
    schema: money,
    defaultValue: (s) => s.deal.askingPricePence ?? 0,
  }),
  def({
    key: "purchase.legal",
    label: "Legal fees",
    section: "purchase",
    kind: "money",
    schema: money,
    defaultValue: (s) => s.defaults.purchase.legalPence,
  }),
  def({
    key: "purchase.survey",
    label: "Survey",
    section: "purchase",
    kind: "money",
    schema: money,
    defaultValue: (s) => s.defaults.purchase.surveyPence,
  }),
  def({
    key: "purchase.sourcing",
    label: "Sourcing / buying agent fee",
    section: "purchase",
    kind: "money",
    schema: money,
    defaultValue: (s) => s.defaults.purchase.sourcingPence,
  }),
  def({
    key: "purchase.other",
    label: "Other buying costs",
    section: "purchase",
    kind: "money",
    schema: money,
    defaultValue: (s) => s.defaults.purchase.otherPence,
  }),
  def({
    key: "purchase.completionDate",
    label: "Expected completion",
    section: "purchase",
    kind: "date",
    description: "Selects which tax rules apply.",
    schema: isoDate,
    defaultValue: (s) =>
      addMonths(s.today, s.defaults.purchase.monthsToComplete),
  }),

  // Purchase finance
  def({
    key: "purchaseFinance.product",
    label: "Purchase finance",
    section: "finance",
    kind: "product",
    schema: productId,
    defaultValue: () => null,
  }),
  def({
    key: "purchaseFinance.ltv",
    label: "Purchase LTV",
    section: "finance",
    kind: "ratio",
    schema: ratio,
    defaultValue: (s) => s.defaults.finance.purchaseLtv,
  }),

  // Refurb
  def({
    key: "refurb.contingency",
    label: "Contingency",
    section: "refurb",
    kind: "ratio",
    schema: ratio,
    defaultValue: (s) => s.defaults.refurb.contingency,
  }),
  def({
    key: "refurb.months",
    label: "Refurb duration",
    section: "refurb",
    kind: "months",
    schema: months,
    defaultValue: (s) => s.defaults.refurb.months,
  }),

  // Holding
  def({
    key: "holding.councilTaxMonthly",
    label: "Council tax (monthly)",
    section: "holding",
    kind: "money",
    schema: money,
    defaultValue: (s) => s.defaults.holding.councilTaxMonthlyPence,
  }),
  def({
    key: "holding.utilitiesMonthly",
    label: "Utilities (monthly)",
    section: "holding",
    kind: "money",
    schema: money,
    defaultValue: (s) => s.defaults.holding.utilitiesMonthlyPence,
  }),
  def({
    key: "holding.insuranceMonthly",
    label: "Insurance (monthly)",
    section: "holding",
    kind: "money",
    schema: money,
    defaultValue: (s) => s.defaults.holding.insuranceMonthlyPence,
  }),
  def({
    key: "holding.otherMonthly",
    label: "Other holding costs (monthly)",
    section: "holding",
    kind: "money",
    schema: money,
    defaultValue: (s) => s.defaults.holding.otherMonthlyPence,
  }),

  // Exit
  def({
    key: "exit.gdv",
    label: "End value (GDV)",
    section: "exit",
    kind: "money",
    description:
      "Value after refurb. Used as the sale price and the refinance valuation.",
    schema: money,
    defaultValue: (s) =>
      s.deal.suggestedGdvPence ?? s.deal.askingPricePence ?? 0,
  }),

  // Flip
  def({
    key: "flip.agentFee",
    label: "Estate agent fee",
    section: "flip",
    kind: "ratio",
    schema: ratio,
    defaultValue: (s) => s.defaults.flip.agentFee,
  }),
  def({
    key: "flip.agentFeeVat",
    label: "Agent fee plus VAT",
    section: "flip",
    kind: "boolean",
    schema: z.boolean(),
    defaultValue: (s) => s.defaults.flip.agentFeeVat,
  }),
  def({
    key: "flip.saleLegal",
    label: "Sale legal fees",
    section: "flip",
    kind: "money",
    schema: money,
    defaultValue: (s) => s.defaults.flip.saleLegalPence,
  }),
  def({
    key: "flip.monthsToSell",
    label: "Months to sell (after refurb)",
    section: "flip",
    kind: "months",
    schema: months,
    defaultValue: (s) => s.defaults.flip.monthsToSell,
  }),
  def({
    key: "flip.taxMode",
    label: "Tax treatment",
    section: "flip",
    kind: "enum",
    options: TAX_MODE_OPTIONS,
    schema: z.enum(["income_tax", "cgt", "corp_tax"]),
    defaultValue: (s) => (s.buyerEntity === "ltd" ? "corp_tax" : "income_tax"),
  }),
  def({
    key: "flip.otherIncome",
    label: "Other taxable income",
    section: "flip",
    kind: "money",
    description:
      "Your other income this tax year. The flip profit is taxed on top of it.",
    schema: money,
    defaultValue: (s) => s.defaults.flip.otherIncomePence,
  }),

  // Keep
  def({
    key: "keep.product",
    label: "Refinance product",
    section: "keep",
    kind: "product",
    schema: productId,
    defaultValue: () => null,
  }),
  def({
    key: "keep.refinanceLtv",
    label: "Refinance LTV",
    section: "keep",
    kind: "ratio",
    schema: ratio,
    defaultValue: (s) => s.defaults.keep.refinanceLtv,
  }),
  def({
    key: "keep.rentMonthly",
    label: "Rent (monthly)",
    section: "keep",
    kind: "money",
    schema: money,
    defaultValue: () => 0,
  }),
  def({
    key: "keep.management",
    label: "Management",
    section: "keep",
    kind: "ratio",
    schema: ratio,
    defaultValue: (s) => s.defaults.keep.management,
  }),
  def({
    key: "keep.voids",
    label: "Voids",
    section: "keep",
    kind: "ratio",
    schema: ratio,
    defaultValue: (s) => s.defaults.keep.voids,
  }),
  def({
    key: "keep.maintenance",
    label: "Maintenance",
    section: "keep",
    kind: "ratio",
    schema: ratio,
    defaultValue: (s) => s.defaults.keep.maintenance,
  }),
  def({
    key: "keep.insuranceMonthly",
    label: "Landlord insurance (monthly)",
    section: "keep",
    kind: "money",
    schema: money,
    defaultValue: (s) => s.defaults.keep.insuranceMonthlyPence,
  }),
  def({
    key: "keep.groundRentServiceMonthly",
    label: "Ground rent / service charge (monthly)",
    section: "keep",
    kind: "money",
    schema: money,
    defaultValue: (s) => s.defaults.keep.groundRentServiceMonthlyPence,
  }),
  def({
    key: "keep.otherMonthly",
    label: "Other letting costs (monthly)",
    section: "keep",
    kind: "money",
    schema: money,
    defaultValue: (s) => s.defaults.keep.otherMonthlyPence,
  }),
  def({
    key: "keep.refinanceLegal",
    label: "Refinance legal fees",
    section: "keep",
    kind: "money",
    schema: money,
    defaultValue: (s) => s.defaults.keep.refinanceLegalPence,
  }),
] as const

export type InputKey = (typeof INPUT_DEFS)[number]["key"]

const REFURB_ITEM_KEY = /^refurb_item:([0-9a-f-]{36}|[\w-]+)\.cost$/

export function refurbItemCostKey(itemId: string): string {
  return `refurb_item:${itemId}.cost`
}

export function parseRefurbItemKey(key: string): string | null {
  return REFURB_ITEM_KEY.exec(key)?.[1] ?? null
}

const BY_KEY = new Map<string, InputDef>(
  INPUT_DEFS.map((d) => [d.key, d as InputDef])
)

const REFURB_ITEM_DEF: Omit<InputDef<Pence>, "key"> = {
  label: "Refurb line cost",
  section: "refurb",
  kind: "money",
  schema: money,
  defaultValue: () => 0,
}

/** Looks up a definition, including dynamic refurb line keys. */
export function inputDef(key: string): InputDef | undefined {
  const known = BY_KEY.get(key)
  if (known) return known
  return parseRefurbItemKey(key)
    ? ({ ...REFURB_ITEM_DEF, key } as InputDef)
    : undefined
}
