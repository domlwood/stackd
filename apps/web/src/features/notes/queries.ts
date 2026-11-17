import "server-only"

import { cache } from "react"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/database.types"
import type { CompStatus } from "./schemas"
import type { DealNote } from "./types"

type NoteRow = Database["public"]["Tables"]["deal_note"]["Row"]

export const NOTE_COLUMNS =
  "id, deal_id, kind, body, link_url, comp_address, comp_price_pence, comp_status, comp_date, comp_beds, comp_floor_area_sqm, pinned, author_id, created_at, updated_at"

export function toDealNote(row: Omit<NoteRow, "workspace_id">): DealNote {
  const comparable =
    row.kind === "comparable" &&
    row.comp_address !== null &&
    row.comp_price_pence !== null
  return {
    id: row.id,
    dealId: row.deal_id,
    kind: comparable ? "comparable" : "note",
    body: row.body,
    linkUrl: row.link_url,
    comp: comparable
      ? {
          address: row.comp_address!,
          pricePence: Number(row.comp_price_pence),
          status: (row.comp_status ?? "sold") as CompStatus,
          date: row.comp_date,
          beds: row.comp_beds,
          floorAreaSqm:
            row.comp_floor_area_sqm === null
              ? null
              : Number(row.comp_floor_area_sqm),
        }
      : null,
    pinned: row.pinned,
    authorId: row.author_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Pinned first, then newest first. RLS limits this to the workspace. */
export const listDealNotes = cache(
  async (dealId: string): Promise<DealNote[]> => {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from("deal_note")
      .select(NOTE_COLUMNS)
      .eq("deal_id", dealId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200)
    if (error) throw new Error(`Could not load notes: ${error.message}`)
    return data.map(toDealNote)
  }
)
