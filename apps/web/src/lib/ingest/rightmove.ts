import {
  extractJsonAfter,
  findObject,
  metaContent,
  scriptContents,
  stripTags,
} from "./json-extract"
import { fetchText, IngestError } from "./http"
import { decodeRightmoveModel } from "./rightmove-model"
import {
  listingStatus,
  type Confidence,
  type Field,
  type ListingFields,
  type ListingProvider,
  type ListingResult,
  type PropertyType,
  type Tenure,
} from "./types"

/**
 * Rightmove listing provider. Rightmove's terms restrict automated access and the
 * page structure changes without notice, so this is isolated, user-initiated (one
 * page per paste), cached, and always falls back to manual entry.
 */

export const RIGHTMOVE_HOSTS = ["rightmove.co.uk"] as const
const MAX_PHOTOS = 20
const SQM_PER_SQFT = 0.092903

export function parseRightmoveUrl(
  raw: string
): { propertyId: string; canonicalUrl: string } | null {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (!/(^|\.)rightmove\.co\.uk$/i.test(url.hostname)) return null
  const id =
    /\/properties\/(\d{5,12})/.exec(url.pathname)?.[1] ??
    /property-(\d{5,12})\.html/.exec(url.pathname)?.[1]
  if (!id) return null
  return {
    propertyId: id,
    canonicalUrl: `https://www.rightmove.co.uk/properties/${id}`,
  }
}

const field = <T>(
  value: T,
  confidence: Confidence,
  source: string
): Field<T> => ({ value, confidence, source })

export function parsePricePence(raw: string | undefined | null): number | null {
  if (!raw) return null
  const m = /£\s?([\d,]+(?:\.\d+)?)\s*(m|k)?/i.exec(raw)
  if (!m?.[1]) return null
  const multiplier =
    m[2]?.toLowerCase() === "m"
      ? 1_000_000
      : m[2]?.toLowerCase() === "k"
        ? 1_000
        : 1
  return Math.round(Number(m[1].replace(/,/g, "")) * multiplier * 100)
}

export function mapPropertyType(
  raw: string | undefined | null
): PropertyType | null {
  if (!raw) return null
  const s = raw.toLowerCase()
  if (/semi/.test(s)) return "semi_detached"
  if (/terrace|town house|cottage/.test(s)) return "terraced"
  if (/detached/.test(s)) return "detached"
  if (/bungalow/.test(s)) return "bungalow"
  if (/flat|apartment|maisonette|studio|penthouse/.test(s)) return "flat"
  if (/house/.test(s)) return "other"
  return null
}

export function mapTenure(raw: string | undefined | null): Tenure | null {
  if (!raw) return null
  const s = raw.toLowerCase().replace(/[_-]/g, " ")
  if (/share of freehold/.test(s)) return "share_of_freehold"
  if (/freehold/.test(s)) return "freehold"
  if (/leasehold/.test(s)) return "leasehold"
  return null
}

const POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i
const OUTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*$/i

/** "Added on 03/11/2026" / "Reduced on 01/10/2026" → ISO date. */
export function parseListedDate(raw: string | undefined | null): string | null {
  const m = raw ? /(\d{2})\/(\d{2})\/(\d{4})/.exec(raw) : null
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v)
    ? v
    : typeof v === "string" && v.trim() && Number.isFinite(Number(v))
      ? Number(v)
      : undefined
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

/** Maps Rightmove's embedded property model onto listing fields (high confidence). */
function fromPropertyModel(p: Record<string, unknown>): Partial<ListingFields> {
  const out: Partial<ListingFields> = {}
  const src = "Listing data"
  const address = obj(p.address)
  const display = str(address.displayAddress)
  if (display)
    out.addressLine = field(display.replace(/\s+/g, " "), "high", src)
  const outcode = str(address.outcode)
  const incode = str(address.incode)
  if (outcode && incode)
    out.postcode = field(
      `${outcode.toUpperCase()} ${incode.toUpperCase()}`,
      "high",
      src
    )
  else if (outcode) out.outcode = field(outcode.toUpperCase(), "high", src)
  else if (display && POSTCODE.exec(display)) {
    const m = POSTCODE.exec(display)
    out.postcode = field(
      `${m?.[1]?.toUpperCase()} ${m?.[2]?.toUpperCase()}`,
      "medium",
      "Address text"
    )
  } else if (display && OUTCODE.exec(display))
    out.outcode = field(
      OUTCODE.exec(display)?.[1]?.toUpperCase() ?? "",
      "medium",
      "Address text"
    )

  const prices = obj(p.prices)
  const price = parsePricePence(str(prices.primaryPrice))
  const qualifier = str(prices.displayPriceQualifier)
  if (price !== null)
    out.askingPricePence = field(
      price,
      qualifier ? "medium" : "high",
      qualifier ? `Listing price (${qualifier})` : src
    )
  if (qualifier) out.priceQualifier = field(qualifier, "high", src)

  const beds = num(p.bedrooms)
  if (beds !== undefined) out.beds = field(beds, "high", src)
  const baths = num(p.bathrooms)
  if (baths !== undefined) out.baths = field(baths, "high", src)

  const type = mapPropertyType(str(p.propertySubType) ?? str(p.propertyType))
  if (type) out.propertyType = field(type, "high", src)

  const tenure = mapTenure(str(obj(p.tenure).tenureType) ?? str(p.tenure))
  if (tenure) out.tenure = field(tenure, "high", src)

  const sizes = arr(p.sizings).map(obj)
  const sqm = sizes.find((s) => /sq\s?m/i.test(str(s.unit) ?? ""))
  const sqft = sizes.find((s) => /sq\s?ft/i.test(str(s.unit) ?? ""))
  const sqmValue =
    num(sqm?.minimumSize) ??
    (num(sqft?.minimumSize) !== undefined
      ? Math.round((num(sqft?.minimumSize) ?? 0) * SQM_PER_SQFT * 10) / 10
      : undefined)
  if (sqmValue) out.floorAreaSqm = field(sqmValue, "high", src)

  const features = arr(p.keyFeatures)
    .map(str)
    .filter((s): s is string => Boolean(s))
  if (features.length)
    out.keyFeatures = field(features.map(stripTags), "high", src)

  const text = obj(p.text)
  const description = str(text.description)
  if (description) out.description = field(stripTags(description), "high", src)

  const photos = arr(p.images)
    .map((i) => str(obj(i).url) ?? str(obj(i).srcUrl))
    .filter((u): u is string => Boolean(u && /^https:\/\//.test(u)))
    .slice(0, MAX_PHOTOS)
  if (photos.length) out.photos = field(photos, "high", src)

  const customer = obj(p.customer)
  const agent = str(customer.branchDisplayName) ?? str(customer.companyName)
  if (agent) out.agent = field(agent, "high", src)

  const listed = parseListedDate(str(obj(p.listingHistory).listingUpdateReason))
  if (listed) out.listedAt = field(listed, "medium", "Listing history")

  const location = obj(p.location)
  const lat = num(location.latitude)
  const lng = num(location.longitude)
  if (lat !== undefined && lng !== undefined) {
    out.lat = field(lat, "high", src)
    out.lng = field(lng, "high", src)
  }
  return out
}

/** Open Graph fallback: "3 bedroom semi-detached house for sale in Elm Grove, Sheffield, S7 for £210,000". */
function fromMeta(html: string): Partial<ListingFields> {
  const out: Partial<ListingFields> = {}
  const src = "Page title"
  const title =
    metaContent(html, "og:title") ?? /<title>([^<]*)<\/title>/i.exec(html)?.[1]
  if (title) {
    const beds = /(\d+)\s+bed(?:room)?/i.exec(title)?.[1]
    if (beds) out.beds = field(Number(beds), "medium", src)
    const type = mapPropertyType(
      /bed(?:room)?\s+([a-z -]+?)\s+for sale/i.exec(title)?.[1]
    )
    if (type) out.propertyType = field(type, "medium", src)
    const address = /for sale in (.+?)(?: for £| \|| - Rightmove|$)/i.exec(
      title
    )?.[1]
    if (address) out.addressLine = field(address.trim(), "medium", src)
    const price = parsePricePence(/for (£[\d,.]+[mk]?)/i.exec(title)?.[1])
    if (price !== null) out.askingPricePence = field(price, "medium", src)
    const outcode = address ? OUTCODE.exec(address)?.[1] : undefined
    if (outcode) out.outcode = field(outcode.toUpperCase(), "medium", src)
  }
  const image = metaContent(html, "og:image")
  if (image && /^https:\/\//.test(image))
    out.photos = field([image], "medium", "Page image")
  const description = metaContent(html, "og:description")
  if (description)
    out.description = field(description, "medium", "Page summary")
  return out
}

/** Low-confidence hints from free text (only where structured data had nothing). */
function fromText(fields: Partial<ListingFields>): Partial<ListingFields> {
  const out: Partial<ListingFields> = {}
  const text = [fields.description?.value, ...(fields.keyFeatures?.value ?? [])]
    .filter(Boolean)
    .join("\n")
  if (!text) return out
  if (!fields.tenure) {
    const tenure = mapTenure(
      /\b(share of freehold|freehold|leasehold)\b/i.exec(text)?.[1]
    )
    if (tenure) out.tenure = field(tenure, "low", "Description text")
  }
  if (!fields.floorAreaSqm) {
    const sqft = /([\d,]{3,6})\s*(?:sq\.?\s?ft|square feet)/i.exec(text)?.[1]
    const sqm = /([\d.]{2,6})\s*(?:sq\.?\s?m\b|m²|square met)/i.exec(text)?.[1]
    const value = sqm
      ? Number(sqm)
      : sqft
        ? Math.round(Number(sqft.replace(/,/g, "")) * SQM_PER_SQFT * 10) / 10
        : null
    if (value && value > 10 && value < 2000)
      out.floorAreaSqm = field(value, "low", "Description text")
  }
  return out
}

/** Parses a Rightmove listing page. Pure: no network. */
export function parseRightmoveHtml(html: string, url: string): ListingResult {
  const ref = parseRightmoveUrl(url)
  const models = [
    extractJsonAfter(html, /window\.__PAGE_MODEL\s*=\s*/),
    extractJsonAfter(html, /window\.PAGE_MODEL\s*=\s*/),
    ...scriptContents(html, "application/json").map((s) => {
      try {
        return JSON.parse(s) as unknown
      } catch {
        return undefined
      }
    }),
  ].map(decodeRightmoveModel)
  const property = models
    .map((m) =>
      findObject(
        m,
        (o) =>
          "prices" in o &&
          "address" in o &&
          ("bedrooms" in o || "propertySubType" in o)
      )
    )
    .find(Boolean)

  const structured = property ? fromPropertyModel(property) : {}
  const meta = fromMeta(html)
  // Structured data wins; meta fills gaps.
  const merged: Partial<ListingFields> = { ...meta, ...structured }
  const fields: Partial<ListingFields> = { ...merged, ...fromText(merged) }
  if (fields.postcode) delete fields.outcode

  const status = listingStatus(fields)
  return {
    status,
    provider: "rightmove",
    providerRef: ref?.propertyId ?? null,
    url: ref?.canonicalUrl ?? url,
    fields,
    message:
      status === "failed"
        ? "We couldn't read that listing. Rightmove may have changed their page. Enter the details manually; your link is kept."
        : status === "partial"
          ? "Some details couldn't be read from the listing. Check them in the Listing tab."
          : undefined,
  }
}

export function createRightmoveProvider(
  fetchImpl?: typeof fetch
): ListingProvider {
  return {
    id: "rightmove",
    canHandle: (url) => parseRightmoveUrl(url) !== null,
    async fetch(url, opts) {
      const ref = parseRightmoveUrl(url)
      if (!ref)
        return {
          status: "failed",
          provider: "rightmove",
          providerRef: null,
          url,
          fields: {},
          message: "That doesn't look like a Rightmove property link.",
        }
      try {
        const html = await fetchText(ref.canonicalUrl, {
          allowedHosts: RIGHTMOVE_HOSTS,
          fetchImpl,
          signal: opts?.signal,
        })
        return { ...parseRightmoveHtml(html, ref.canonicalUrl), rawHtml: html }
      } catch (error) {
        const message =
          error instanceof IngestError
            ? error.message
            : "We couldn't read that listing."
        return {
          status: "failed",
          provider: "rightmove",
          providerRef: ref.propertyId,
          url: ref.canonicalUrl,
          fields: {},
          message: `${message} Enter the details manually; your link is kept.`,
        }
      }
    },
  }
}
