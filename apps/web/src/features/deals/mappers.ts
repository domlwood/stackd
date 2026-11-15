import type { StoredInput } from "@/lib/inputs/resolve"
import type { Tables } from "@/lib/supabase/database.types"
import type { Deal } from "./types"

export function rowToDeal(row: Tables<"deal">): Deal {
  return {
    id: row.id,
    status: row.status as Deal["status"],
    passedReason: row.passed_reason,
    statusChangedAt: row.status_changed_at,
    addressLine: row.address_line,
    postcode: row.postcode,
    lat: row.lat,
    lng: row.lng,
    propertyType: row.property_type as Deal["propertyType"],
    tenure: row.tenure as Deal["tenure"],
    beds: row.beds,
    baths: row.baths,
    floorAreaSqm:
      row.floor_area_sqm === null ? null : Number(row.floor_area_sqm),
    askingPricePence:
      row.asking_price_pence === null ? null : Number(row.asking_price_pence),
    listingUrl: row.listing_url,
    agent: row.agent,
    listedAt: row.listed_at,
    description: row.description,
    keyFeatures: row.key_features,
    coverPhotoUrl: row.cover_photo_url,
    photoUrls: row.photo_urls,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function rowToStoredInput(row: Tables<"deal_input">): StoredInput {
  return {
    key: row.key,
    scope: row.scope as StoredInput["scope"],
    userId: row.user_id,
    value: row.value,
    setBy: row.set_by,
    setAt: row.set_at,
    sourceText: row.source_text,
    sourceUrl: row.source_url,
    note: row.note,
  }
}
