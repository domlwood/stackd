/**
 * Seeds the hosted/local Supabase project. Idempotent.
 * Phase 1: 2 users, workspace, settings. Phase 2: 3 fund pots, 4 finance products.
 * Phase 3: verified England tax rule sets (global). Phase 4: 4 deals across statuses.
 * Later phases add deals, comps, proposals and comments.
 */
import { DEFAULT_SETTINGS } from "@/features/settings/schemas"
import { DEFAULT_WORKSPACE_NAME } from "@/lib/app"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { addMember, ensureWorkspace, requireEnv, upsertUser } from "./lib"
import { seedFinance } from "./seed-finance"
import { seedDeals } from "./seed-deals"
import { seedTaxRules } from "./seed-tax-rules"

async function main() {
  const admin = createSupabaseAdminClient()
  const workspaceId = await ensureWorkspace(
    admin,
    process.env.SEED_WORKSPACE_NAME ?? DEFAULT_WORKSPACE_NAME
  )

  const userIds: Record<"A" | "B", string> = { A: "", B: "" }
  for (const slot of ["A", "B"] as const) {
    const userId = await upsertUser(admin, {
      email: requireEnv(`SEED_USER_${slot}_EMAIL`),
      password: requireEnv(`SEED_USER_${slot}_PASSWORD`),
      displayName: requireEnv(`SEED_USER_${slot}_NAME`),
    })
    await addMember(admin, workspaceId, userId)
    userIds[slot] = userId
    console.log(`✔ user ${slot} ready`)
  }

  const { error } = await admin.from("workspace_settings").upsert(
    {
      workspace_id: workspaceId,
      buy_box: DEFAULT_SETTINGS.buyBox,
      defaults: DEFAULT_SETTINGS.defaults,
      stale_after_days: DEFAULT_SETTINGS.staleAfterDays,
      buyer_entity: DEFAULT_SETTINGS.buyerEntity,
    },
    { onConflict: "workspace_id", ignoreDuplicates: true }
  )
  if (error) throw error
  await seedFinance(admin, workspaceId, { a: userIds.A, b: userIds.B })
  await seedTaxRules(admin)
  await seedDeals(admin, workspaceId, { a: userIds.A, b: userIds.B })
  console.log(`✔ workspace ${workspaceId} seeded`)
}

main().catch((error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
