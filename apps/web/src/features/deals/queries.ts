import "server-only"

import { notFound } from "next/navigation"
import { cache } from "react"
import { z } from "zod"

import { requireSession } from "@/lib/auth/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { listTaxRuleRecords } from "@/features/settings/tax-rules"
import { getSettings, listMembers } from "@/features/workspace/queries"
import { rowToDeal, rowToStoredInput } from "./mappers"
import { computeBuyingPower } from "@/features/finance/rules"
import { listAllProducts, listFundPots } from "@/features/finance/queries"
import { todayIso } from "./portfolio"
import type { DealWorkspaceData } from "./types"

/** Everything the deal page needs; the client runs the engine for instant recalculation. */
export const getDealWorkspace = cache(
  async (dealId: string): Promise<DealWorkspaceData> => {
    if (!z.uuid().safeParse(dealId).success) notFound()
    const session = await requireSession()
    const supabase = await createSupabaseServerClient()

    const [
      dealRes,
      inputsRes,
      refurbRes,
      products,
      pots,
      settings,
      ruleRecords,
      members,
    ] = await Promise.all([
      supabase.from("deal").select("*").eq("id", dealId).maybeSingle(),
      supabase.from("deal_input").select("*").eq("deal_id", dealId),
      supabase
        .from("refurb_item")
        .select("id, category, description, ordinal")
        .eq("deal_id", dealId)
        .order("ordinal")
        .order("created_at"),
      // Not the whole portfolio: that would analyse every deal on each deal page.
      listAllProducts(),
      listFundPots(),
      getSettings(),
      listTaxRuleRecords(),
      listMembers(),
    ])
    if (dealRes.error)
      throw new Error(`Could not load this deal: ${dealRes.error.message}`)
    if (!dealRes.data) notFound()
    if (inputsRes.error || refurbRes.error)
      throw new Error("Could not load this deal's inputs.")

    return {
      deal: rowToDeal(dealRes.data),
      stored: inputsRes.data.map(rowToStoredInput),
      refurbLines: refurbRes.data.map((l) => ({
        id: l.id,
        category: l.category,
        description: l.description ?? "",
        ordinal: l.ordinal,
      })),
      // Active products, plus archived ones this deal still references.
      products,
      ruleRecords,
      settings,
      members,
      freeBuyingPowerPence: computeBuyingPower(pots, []).freePence,
      today: todayIso(),
      currentUserId: session.userId,
    }
  }
)

export type ActivityItem = {
  id: number
  action: string
  entityType: string
  field: string | null
  oldValue: unknown
  newValue: unknown
  actorId: string | null
  createdAt: string
}

const ACTIVITY_PAGE = 100

export const listDealActivity = cache(
  async (dealId: string): Promise<ActivityItem[]> => {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from("activity_event")
      .select(
        "id, action, entity_type, field, old_value, new_value, actor_id, created_at"
      )
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_PAGE)
    if (error) throw new Error(`Could not load activity: ${error.message}`)
    return data.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entity_type,
      field: r.field,
      oldValue: r.old_value,
      newValue: r.new_value,
      actorId: r.actor_id,
      createdAt: r.created_at,
    }))
  }
)
