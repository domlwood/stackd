import { inputDef } from "@/lib/inputs/registry"
import { formatInputValue, type ProductLabel } from "@/features/analysis/format"
import { formatMoney } from "@/lib/format/money"
import { DEAL_STATUS_LABELS, type DealStatus } from "./schemas"

export type ActivityLike = {
  action: string
  entityType: string
  field: string | null
  oldValue: unknown
  newValue: unknown
}

const DEAL_FIELD_LABELS: Record<string, string> = {
  status: "Status",
  passed_reason: "Reason for passing",
  address_line: "Address",
  postcode: "Postcode",
  asking_price_pence: "Asking price",
  floor_area_sqm: "Floor area",
  property_type: "Property type",
  tenure: "Tenure",
  beds: "Bedrooms",
  baths: "Bathrooms",
  listing_url: "Listing link",
  agent: "Agent",
  description: "Description",
}

const HIDDEN_DEAL_FIELDS = new Set([
  "status_changed_at",
  "comp_search",
  "key_features",
  "lat",
  "lng",
  "created_by",
])

function valueOf(payload: unknown): unknown {
  return payload && typeof payload === "object" && "value" in payload
    ? (payload as { value: unknown }).value
    : payload
}

function plain(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  if (field === "status")
    return DEAL_STATUS_LABELS[value as DealStatus] ?? String(value)
  if (field.endsWith("_pence")) return formatMoney(Number(value))
  return String(value)
}

/** One human sentence per activity event, or null if it's noise. */
export function describeActivity(
  event: ActivityLike,
  products: readonly ProductLabel[] = []
): string | null {
  if (
    event.entityType === "deal_input" ||
    event.entityType === "deal_proposal"
  ) {
    const def = event.field ? inputDef(event.field) : undefined
    const label = def?.label ?? event.field ?? "an input"
    const fmt = (v: unknown) =>
      def ? formatInputValue(def, valueOf(v), products) : String(valueOf(v))
    const prefix = event.entityType === "deal_proposal" ? "proposed" : "set"
    if (event.action === "create")
      return `${prefix} ${label} to ${fmt(event.newValue)}`
    if (event.action === "delete")
      return event.entityType === "deal_proposal"
        ? `withdrew their proposal for ${label}`
        : `reset ${label} to its default`
    const before = fmt(event.oldValue)
    const after = fmt(event.newValue)
    return before === after
      ? `updated the source or note for ${label}`
      : `changed ${label}: ${before} → ${after}`
  }
  if (event.entityType === "deal") {
    if (event.action === "create") return "created the deal"
    if (event.action === "delete") return "deleted the deal"
    if (!event.field || HIDDEN_DEAL_FIELDS.has(event.field)) return null
    const label = DEAL_FIELD_LABELS[event.field] ?? event.field
    if (event.field === "status")
      return `moved the deal: ${plain("status", event.oldValue)} → ${plain("status", event.newValue)}`
    return `changed ${label}: ${plain(event.field, event.oldValue)} → ${plain(event.field, event.newValue)}`
  }
  if (event.entityType === "refurb_item") {
    const row = (event.newValue ?? event.oldValue) as {
      category?: string
    } | null
    const name = row?.category ?? "a refurb line"
    if (event.action === "create") return `added refurb line ${name}`
    if (event.action === "delete") return `removed refurb line ${name}`
    if (event.field === "ordinal") return null
    return `edited refurb line ${event.field === "category" ? `${plain("x", event.oldValue)} → ${plain("x", event.newValue)}` : name}`
  }
  return null
}
