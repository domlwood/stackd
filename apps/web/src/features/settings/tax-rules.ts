import "server-only"

import { cache } from "react"

import type { RuleSetRecord } from "@/lib/calc/rules/schema"
import { createSupabaseServerClient } from "@/lib/supabase/server"

/** All rule versions visible to this workspace (global + its own edits). */
export const listTaxRuleRecords = cache(async (): Promise<RuleSetRecord[]> => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("tax_rule_set")
    .select(
      "kind, effective_from, effective_to, data, source_url, verified_at, workspace_id"
    )
    .order("effective_from", { ascending: false })
  if (error) throw new Error(`Could not load tax rules: ${error.message}`)
  return data.map((row) => ({
    kind: row.kind as RuleSetRecord["kind"],
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    data: row.data,
    sourceUrl: row.source_url,
    verifiedAt: row.verified_at,
    workspaceScoped: row.workspace_id !== null,
  }))
})
