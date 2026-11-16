import { z } from "zod"

/**
 * Status records your decision only; the verdict says how good the deal is.
 * Active: still in play. Passed: decided against (needs a reason). Bought: yours.
 */
export const DEAL_STATUSES = ["active", "passed", "bought"] as const
export type DealStatus = (typeof DEAL_STATUSES)[number]

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  active: "Active",
  passed: "Passed",
  bought: "Bought",
}

/** Statuses retired in Nov 2026 (all became Active); kept so old activity reads well. */
export const LEGACY_STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  analysing: "Analysing",
  viewing: "Viewing",
  offer: "Offer",
  accepted: "Accepted",
}

export const PROPERTY_TYPES = [
  "detached",
  "semi_detached",
  "terraced",
  "flat",
  "bungalow",
  "other",
] as const
export const PROPERTY_TYPE_LABELS: Record<
  (typeof PROPERTY_TYPES)[number],
  string
> = {
  detached: "Detached",
  semi_detached: "Semi-detached",
  terraced: "Terraced",
  flat: "Flat",
  bungalow: "Bungalow",
  other: "Other",
}

export const TENURES = [
  "freehold",
  "leasehold",
  "share_of_freehold",
  "unknown",
] as const
export const TENURE_LABELS: Record<(typeof TENURES)[number], string> = {
  freehold: "Freehold",
  leasehold: "Leasehold",
  share_of_freehold: "Share of freehold",
  unknown: "Unknown",
}

/** UK postcode (loose): outward + inward code. */
const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i

export function normalisePostcode(raw: string): string {
  const compact = raw.replace(/\s+/g, "").toUpperCase()
  return compact.length > 3
    ? `${compact.slice(0, -3)} ${compact.slice(-3)}`
    : compact
}

/** Postcode district for filtering, e.g. "LS6 3AB" → "LS6". */
export function postcodeDistrict(postcode: string | null): string | null {
  if (!postcode) return null
  return normalisePostcode(postcode).split(" ")[0] ?? null
}

const optionalInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullable()

export const dealDetailsSchema = z.object({
  addressLine: z.string().trim().min(1, "Enter the address").max(200),
  postcode: z
    .string()
    .trim()
    .max(10)
    .refine((v) => v === "" || POSTCODE.test(v), "Enter a valid UK postcode")
    .transform((v) => (v === "" ? null : normalisePostcode(v)))
    .nullable(),
  propertyType: z.enum(PROPERTY_TYPES).nullable(),
  tenure: z.enum(TENURES).nullable(),
  beds: optionalInt(0, 30),
  baths: optionalInt(0, 30),
  floorAreaSqm: z.number().positive().max(10_000).nullable(),
  askingPricePence: z.number().int().nonnegative().nullable(),
  listingUrl: z
    .union([z.url("Enter a full URL, including https://"), z.literal("")])
    .nullable(),
  agent: z.string().trim().max(120).nullable(),
  description: z.string().trim().max(10_000).nullable(),
})

export type DealDetailsInput = z.input<typeof dealDetailsSchema>
export type DealDetails = z.output<typeof dealDetailsSchema>

export const statusChangeSchema = z
  .object({
    dealId: z.uuid(),
    status: z.enum(DEAL_STATUSES),
    reason: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.status !== "passed" || (v.reason?.length ?? 0) > 0, {
    path: ["reason"],
    message: "Say why you're passing. It helps when you look back later.",
  })

export const sourceSchema = z.object({
  sourceText: z.string().trim().max(500).optional(),
  sourceUrl: z
    .union([z.url("Enter a full URL, including https://"), z.literal("")])
    .optional(),
  note: z.string().trim().max(2000).optional(),
})

export const setInputSchema = sourceSchema.extend({
  dealId: z.uuid(),
  key: z.string().min(1).max(120),
  value: z.unknown(),
})

export const refurbItemSchema = z.object({
  id: z.uuid().optional(),
  dealId: z.uuid(),
  category: z.string().trim().min(1, "Choose a category").max(60),
  description: z.string().trim().max(300).optional(),
  costPence: z.number().int().nonnegative().optional(),
})

export const REFURB_CATEGORIES = [
  "Kitchen",
  "Bathroom",
  "Electrics",
  "Plumbing & heating",
  "Windows & doors",
  "Roof",
  "Plastering & decorating",
  "Flooring",
  "Structural",
  "Garden & exterior",
  "Fees & skips",
  "Other",
] as const

/** How a quick £/sq ft estimate is split into line items. */
export const ESTIMATE_WEIGHTS: readonly { category: string; weight: number }[] =
  [
    { category: "Kitchen", weight: 0.2 },
    { category: "Bathroom", weight: 0.12 },
    { category: "Electrics", weight: 0.12 },
    { category: "Plumbing & heating", weight: 0.12 },
    { category: "Plastering & decorating", weight: 0.2 },
    { category: "Flooring", weight: 0.1 },
    { category: "Windows & doors", weight: 0.06 },
    { category: "Fees & skips", weight: 0.08 },
  ]
