import { createClient } from "@supabase/supabase-js"

import { parseServerEnv } from "@/lib/env"
import type { Database } from "./database.types"

/**
 * Service-role client: BYPASSES RLS. Only for scripts (seed, user:create) and
 * narrowly-scoped trusted server code. Never import from components.
 */
export function createSupabaseAdminClient(
  source: Record<string, string | undefined> = process.env
) {
  const env = parseServerEnv(source)
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )
}
