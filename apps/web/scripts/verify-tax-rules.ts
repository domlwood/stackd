/** Live check: tax rules are readable, immutable and load into the engine. */
import { createClient } from "@supabase/supabase-js"

import { selectTaxRules, type RuleSetRecord } from "@/lib/calc/rules/schema"
import type { Database } from "@/lib/supabase/database.types"

const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✔" : "✖"} ${label}${detail ? ` — ${detail}` : ""}`)
  if (!ok) process.exitCode = 1
}

async function main() {
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { auth: { persistSession: false } }
  )
  const { data: anonRows } = await db.from("tax_rule_set").select("id")
  check("signed-out client sees no rules", (anonRows ?? []).length === 0)

  await db.auth.signInWithPassword({
    email: process.env.SEED_USER_A_EMAIL ?? "",
    password: process.env.SEED_USER_A_PASSWORD ?? "",
  })
  const { data } = await db.from("tax_rule_set").select("*")
  check(
    "member reads the 5 global rule sets",
    (data ?? []).filter((r) => r.workspace_id === null).length === 5
  )

  const records: RuleSetRecord[] = (data ?? []).map((r) => ({
    kind: r.kind as RuleSetRecord["kind"],
    effectiveFrom: r.effective_from,
    effectiveTo: r.effective_to,
    data: r.data,
    sourceUrl: r.source_url,
    verifiedAt: r.verified_at,
  }))
  const rules = selectTaxRules(records, "2026-11-15")
  check(
    "rules from the DB validate and load into the engine",
    rules.sdlt.additionalDwellingSurcharge === 0.05 &&
      rules.incomeTax.personalAllowancePence === 1_257_000
  )

  const first = data?.[0]
  const { error: updateError, count } = await db
    .from("tax_rule_set")
    .update({ note: "tamper" }, { count: "exact" })
    .eq("id", first?.id ?? "")
  check(
    "rule rows are immutable for clients",
    !!updateError || count === 0,
    updateError?.message ?? "0 rows"
  )

  const { error: globalInsert } = await db.from("tax_rule_set").insert({
    kind: "vat",
    effective_from: "2030-01-01",
    data: { standardRate: 0.2 },
  })
  check("clients can't add global rules", !!globalInsert, globalInsert?.code)
  await db.auth.signOut()
}

main().catch((e: unknown) => {
  console.error(e)
  process.exit(1)
})
