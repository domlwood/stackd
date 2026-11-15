import type { SessionContext } from "@/lib/auth/session"
import type { ListingFields } from "@/lib/ingest/types"
import type { TablesInsert } from "@/lib/supabase/database.types"
import type { DealDetailsInput } from "@/features/deals/schemas"
import type { WorkspaceSettings } from "@/features/settings/schemas"

/** Listing fields → the deal details form shape (also the manual-fallback prefill). */
export function prefillFrom(
  fields: Partial<ListingFields>,
  url: string
): DealDetailsInput {
  return {
    addressLine: fields.addressLine?.value ?? "",
    postcode: fields.postcode?.value ?? "",
    propertyType: fields.propertyType?.value ?? null,
    tenure: fields.tenure?.value ?? null,
    beds: fields.beds?.value ?? null,
    baths: fields.baths?.value ?? null,
    floorAreaSqm: fields.floorAreaSqm?.value ?? null,
    askingPricePence: fields.askingPricePence?.value ?? null,
    listingUrl: url,
    agent: fields.agent?.value ?? "",
    description: fields.description?.value ?? "",
  }
}

/** Inputs set when a deal is created: the chosen purchase product and its LTV. */
export function initialInputs(args: {
  session: SessionContext
  dealId: string
  product: { id: string; maxLtv: number | null } | null
  settings: WorkspaceSettings
}): TablesInsert<"deal_input">[] {
  const { session, dealId, product, settings } = args
  const base = {
    workspace_id: session.workspaceId,
    deal_id: dealId,
    scope: "agreed",
    user_id: null,
  }
  const rows: TablesInsert<"deal_input">[] = [
    {
      ...base,
      key: "purchaseFinance.product",
      value: product?.id ?? null,
      source_text: "Chosen when the deal was added",
    },
  ]
  const preset = settings.defaults.finance.purchaseLtv
  if (product?.maxLtv != null && product.maxLtv < preset) {
    rows.push({
      ...base,
      key: "purchaseFinance.ltv",
      value: product.maxLtv,
      source_text: "Product's maximum LTV",
    })
  }
  return rows
}
