import { fetchText } from "./http"

/** postcodes.io (open data) geocoding. */
export const POSTCODES_HOSTS = ["api.postcodes.io"] as const
const BASE = "https://api.postcodes.io"

type PostcodeResult = {
  postcode: string
  latitude: number
  longitude: number
  outcode: string
  admin_district: string | null
}

async function getJson<T>(
  path: string,
  fetchImpl?: typeof fetch
): Promise<T | null> {
  try {
    const body = JSON.parse(
      await fetchText(`${BASE}${path}`, {
        allowedHosts: POSTCODES_HOSTS,
        fetchImpl,
        retries: 1,
        timeoutMs: 6_000,
      })
    ) as { status: number; result: T | null }
    return body.status === 200 ? body.result : null
  } catch {
    return null
  }
}

export async function lookupPostcode(
  postcode: string,
  fetchImpl?: typeof fetch
): Promise<PostcodeResult | null> {
  return getJson<PostcodeResult>(
    `/postcodes/${encodeURIComponent(postcode.replace(/\s+/g, ""))}`,
    fetchImpl
  )
}

/** Nearest postcode to a point (used when a listing only gives the outcode). */
export async function nearestPostcode(
  lat: number,
  lng: number,
  fetchImpl?: typeof fetch
): Promise<PostcodeResult | null> {
  const result = await getJson<PostcodeResult[]>(
    `/postcodes?lon=${lng}&lat=${lat}&limit=1`,
    fetchImpl
  )
  return result?.[0] ?? null
}

export async function nearbyPostcodes(
  lat: number,
  lng: number,
  radiusMetres: number,
  fetchImpl?: typeof fetch
): Promise<PostcodeResult[]> {
  const MAX_RADIUS = 2_000
  const LIMIT = 100
  const result = await getJson<PostcodeResult[]>(
    `/postcodes?lon=${lng}&lat=${lat}&radius=${Math.min(radiusMetres, MAX_RADIUS)}&limit=${LIMIT}`,
    fetchImpl
  )
  return result ?? []
}
