/** Live check of finance RLS/RPC/activity as seed user A. Cleans up after itself. */
import { createClient } from "@supabase/supabase-js"

import { productToRpcArgs } from "@/features/finance/mappers"
import { emptyProduct } from "@/features/finance/schemas"
import type { Database } from "@/lib/supabase/database.types"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✔" : "✖"} ${label}${detail ? ` — ${detail}` : ""}`)
  if (!ok) process.exitCode = 1
}

async function main() {
  const db = createClient<Database>(url, anon, {
    auth: { persistSession: false },
  })
  const { error: signInError } = await db.auth.signInWithPassword({
    email: process.env.SEED_USER_A_EMAIL ?? "",
    password: process.env.SEED_USER_A_PASSWORD ?? "",
  })
  check("sign in as user A", !signInError, signInError?.message)
  const { data: member } = await db
    .from("workspace_member")
    .select("workspace_id")
    .limit(1)
    .single()
  const ws = member?.workspace_id ?? ""

  const product = {
    ...emptyProduct("residential"),
    lender: "Verify Script",
    name: `temp-${Date.now()}`,
    rate: 0.05,
    ercBands: [
      { fromMonth: 0, toMonth: 12, pct: 0.03 },
      { fromMonth: 12, toMonth: 24, pct: 0.02 },
    ],
  }
  const { data: id, error } = await db.rpc(
    "save_finance_product",
    productToRpcArgs(product, ws)
  )
  check(
    "save_finance_product creates product + bands",
    !error && !!id,
    error?.message
  )

  const { data: bands } = await db
    .from("erc_band")
    .select("pct")
    .eq("product_id", id ?? "")
    .order("ordinal")
  check(
    "ERC bands stored in order",
    bands?.map((b) => Number(b.pct)).join() === "0.03,0.02"
  )

  const updated = {
    ...product,
    id: id ?? undefined,
    rate: 0.055,
    ercBands: [{ fromMonth: 0, toMonth: 24, pct: 0.025 }],
  }
  const { error: updateError } = await db.rpc(
    "save_finance_product",
    productToRpcArgs(updated, ws)
  )
  check("update via RPC", !updateError, updateError?.message)

  const { data: events } = await db
    .from("activity_event")
    .select("action, field, actor_id")
    .eq("entity_id", id ?? "")
  const fields = (events ?? []).map((e) => `${e.action}:${e.field ?? ""}`)
  check("activity: create logged", fields.includes("create:"))
  check(
    "activity: rate change logged field-level",
    fields.includes("update:rate")
  )
  check(
    "activity: ERC schedule logged as one event",
    fields.filter((f) => f === "event:erc_schedule").length === 2,
    fields.join(", ")
  )
  check(
    "activity: actor recorded",
    (events ?? []).every((e) => !!e.actor_id)
  )

  const { error: tamper } = await db
    .from("activity_event")
    .delete()
    .eq("entity_id", id ?? "")
  const { count: after } = await db
    .from("activity_event")
    .select("id", { count: "exact", head: true })
    .eq("entity_id", id ?? "")
  check(
    "activity log can't be deleted by clients",
    (after ?? 0) === events?.length,
    tamper?.message ?? "no rows affected"
  )

  const { error: badWs } = await db.rpc(
    "save_finance_product",
    productToRpcArgs(product, "00000000-0000-0000-0000-000000000000")
  )
  check("RPC rejects a foreign workspace", !!badWs, badWs?.message)

  const { error: badBand } = await db.from("erc_band").insert({
    workspace_id: ws,
    product_id: id ?? "",
    ordinal: 9,
    from_month: 5,
    to_month: 2,
    pct: 0.01,
  })
  check("DB backstop rejects inverted ERC band", !!badBand, badBand?.code)

  await db
    .from("finance_product")
    .delete()
    .eq("id", id ?? "")
  const { count: gone } = await db
    .from("finance_product")
    .select("id", { count: "exact", head: true })
    .eq("id", id ?? "")
  check("cleanup", gone === 0)

  await db.auth.signOut()
  const { data: anonRows } = await db.from("finance_product").select("id")
  check("signed-out client sees no products", (anonRows ?? []).length === 0)
}

main().catch((e: unknown) => {
  console.error(e)
  process.exit(1)
})
