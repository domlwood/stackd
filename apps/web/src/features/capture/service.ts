import "server-only"

import { gzipSync } from "node:zlib"

import type { SessionContext } from "@/lib/auth/session"
import type { ListingFields, ListingResult } from "@/lib/ingest/types"
import type { SupabaseServerClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/supabase/database.types"

export const SNAPSHOT_CACHE_HOURS = 24
const HOUR_MS = 3_600_000

/** Stores the raw page (gzipped, private bucket) and the parsed fields. Returns the snapshot id. */
export async function saveSnapshot(
  supabase: SupabaseServerClient,
  session: SessionContext,
  result: ListingResult
): Promise<string | null> {
  const id = crypto.randomUUID()
  let rawPath: string | null = null
  if (result.rawHtml) {
    const path = `${session.workspaceId}/${id}.html.gz`
    const { error } = await supabase.storage
      .from("listing-snapshots")
      .upload(path, gzipSync(result.rawHtml), {
        contentType: "application/gzip",
      })
    if (!error) rawPath = path
    else console.error("[ingest] snapshot upload failed", error.message)
  }
  const { error } = await supabase.from("listing_snapshot").insert({
    id,
    workspace_id: session.workspaceId,
    provider: result.provider,
    provider_ref: result.providerRef,
    source_url: result.url,
    status: result.status,
    parsed: result.fields as Json,
    raw_path: rawPath,
    error: result.status === "failed" ? (result.message ?? null) : null,
  })
  if (error) {
    console.error("[ingest] snapshot insert failed", error.message)
    return null
  }
  return id
}

/** A recent successful snapshot of the same listing, so repeat pastes don't refetch. */
export async function findCachedSnapshot(
  supabase: SupabaseServerClient,
  session: SessionContext,
  providerRef: string
): Promise<{
  id: string
  fields: Partial<ListingFields>
  status: ListingResult["status"]
} | null> {
  const since = new Date(
    Date.now() - SNAPSHOT_CACHE_HOURS * HOUR_MS
  ).toISOString()
  const { data } = await supabase
    .from("listing_snapshot")
    .select("id, parsed, status")
    .eq("workspace_id", session.workspaceId)
    .eq("provider", "rightmove")
    .eq("provider_ref", providerRef)
    .neq("status", "failed")
    .gte("fetched_at", since)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
    ? {
        id: data.id,
        fields: data.parsed as Partial<ListingFields>,
        status: data.status as ListingResult["status"],
      }
    : null
}
