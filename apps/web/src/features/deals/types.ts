import type { RuleSetRecord } from "@/lib/calc/rules/schema"
import type { StoredInput } from "@/lib/inputs/resolve"
import type { FinanceProduct } from "@/features/finance/schemas"
import type { WorkspaceSettings } from "@/features/settings/schemas"
import type { Member } from "@/features/workspace/queries"
import type { DealStatus, PROPERTY_TYPES, TENURES } from "./schemas"

export type Deal = {
  id: string
  status: DealStatus
  passedReason: string | null
  statusChangedAt: string
  /** Hidden from the Deals page (sold, or not interested); null when not archived. */
  archivedAt: string | null
  addressLine: string
  postcode: string | null
  lat: number | null
  lng: number | null
  propertyType: (typeof PROPERTY_TYPES)[number] | null
  tenure: (typeof TENURES)[number] | null
  beds: number | null
  baths: number | null
  floorAreaSqm: number | null
  askingPricePence: number | null
  listingUrl: string | null
  agent: string | null
  listedAt: string | null
  description: string | null
  keyFeatures: string[]
  coverPhotoUrl: string | null
  photoUrls: string[]
  createdAt: string
  updatedAt: string
}

export type RefurbLineRecord = {
  id: string
  category: string
  description: string
  ordinal: number
}

/** Everything needed to analyse one deal, serialisable from server to client. */
export type DealWorkspaceData = {
  deal: Deal
  stored: StoredInput[]
  refurbLines: RefurbLineRecord[]
  products: FinanceProduct[]
  ruleRecords: RuleSetRecord[]
  settings: WorkspaceSettings
  members: Member[]
  /** Buying power (total in fund pots) this deal's affordability is judged against. */
  freeBuyingPowerPence: number
  today: string
  currentUserId: string
}
