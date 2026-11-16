import type { SupabaseClient } from "@supabase/supabase-js"

import { ENGLAND_RULES } from "@/lib/calc/rules/england-2026"
import { ruleSchemas } from "@/lib/calc/rules/schema"
import type { Database, Json } from "@/lib/supabase/database.types"

/** Inserts the verified global rule sets (idempotent by kind + effective date). */
export async function seedTaxRules(admin: SupabaseClient<Database>) {
  let added = 0
  for (const rule of ENGLAND_RULES) {
    ruleSchemas[rule.kind].parse(rule.data)
    const { data: existing, error } = await admin
      .from("tax_rule_set")
      .select("id")
      .is("workspace_id", null)
      .eq("kind", rule.kind)
      .eq("effective_from", rule.effectiveFrom)
      .maybeSingle()
    if (error) throw error
    if (existing) continue
    const { error: insertError } = await admin.from("tax_rule_set").insert({
      kind: rule.kind,
      effective_from: rule.effectiveFrom,
      effective_to: rule.effectiveTo,
      data: rule.data as Json,
      source_url: rule.sourceUrl,
      verified_at: rule.verifiedAt,
    })
    if (insertError) throw insertError
    added += 1
  }
  console.log(
    added ? `✔ ${added} tax rule sets` : "• tax rules already present, skipped"
  )
}
