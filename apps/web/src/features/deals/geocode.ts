import "server-only"

import { lookupPostcode } from "@/lib/ingest/postcodes"

/**
 * Map pin for a deal without listing coordinates: the postcode's centre via
 * postcodes.io (open data). Null if the postcode isn't found or the lookup
 * fails; a deal simply shows no map rather than failing to save.
 */
export async function geocodePostcode(
  postcode: string | null | undefined
): Promise<{ lat: number; lng: number } | null> {
  if (!postcode?.trim()) return null
  const result = await lookupPostcode(postcode)
  return result ? { lat: result.latitude, lng: result.longitude } : null
}
