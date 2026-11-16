/** Removes deals created by e2e runs (address starts with "E2E "). */
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
const admin = createSupabaseAdminClient()
const { data, error } = await admin
  .from("deal")
  .delete()
  .like("address_line", "E2E %")
  .select("address_line")
console.log(error ?? `removed ${data?.length} e2e deal(s)`)
