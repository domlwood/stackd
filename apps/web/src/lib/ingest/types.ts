/** Ingestion: swappable providers that turn a source into typed, confidence-scored fields. */

export type Confidence = "high" | "medium" | "low"

export type Field<T> = { value: T; confidence: Confidence; source: string }

export type PropertyType =
  "detached" | "semi_detached" | "terraced" | "flat" | "bungalow" | "other"
export type Tenure = "freehold" | "leasehold" | "share_of_freehold" | "unknown"

export type ListingFields = {
  addressLine: Field<string>
  postcode: Field<string>
  outcode: Field<string>
  askingPricePence: Field<number>
  priceQualifier: Field<string>
  beds: Field<number>
  baths: Field<number>
  propertyType: Field<PropertyType>
  tenure: Field<Tenure>
  floorAreaSqm: Field<number>
  keyFeatures: Field<string[]>
  description: Field<string>
  photos: Field<string[]>
  agent: Field<string>
  listedAt: Field<string>
  lat: Field<number>
  lng: Field<number>
}

export type ListingResult = {
  status: "ok" | "partial" | "failed"
  provider: "rightmove" | "manual"
  providerRef: string | null
  url: string
  fields: Partial<ListingFields>
  rawHtml?: string
  /** Plain-language reason when status is failed (or caveats when partial). */
  message?: string
}

export interface ListingProvider {
  readonly id: ListingResult["provider"]
  canHandle(url: string): boolean
  fetch(url: string, opts?: { signal?: AbortSignal }): Promise<ListingResult>
}

/** Fields that must be present for "ok"; otherwise "partial". */
export const ESSENTIAL_FIELDS: readonly (keyof ListingFields)[] = [
  "addressLine",
  "askingPricePence",
  "beds",
  "propertyType",
]

export function listingStatus(
  fields: Partial<ListingFields>
): ListingResult["status"] {
  const present = ESSENTIAL_FIELDS.filter((k) => fields[k] !== undefined).length
  if (present === 0) return "failed"
  return present === ESSENTIAL_FIELDS.length ? "ok" : "partial"
}
