/** Update an existing account without changing its ID or workspace membership. */
import { parseArgs } from "node:util"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { findUserByEmail, requireEnv } from "./lib"

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      "new-email": { type: "string" },
      name: { type: "string" },
      "password-env": { type: "string" },
    },
  })
  const email = values.email?.trim()
  const newEmail = values["new-email"]?.trim()
  const name = values.name?.trim()
  if (!email || (!newEmail && !name && !values["password-env"]))
    throw new Error(
      'Usage: npm run user:update -- --email <current-email> [--new-email <new-email>] [--name "Name"] [--password-env SEED_USER_B_PASSWORD]'
    )
  if (values.name !== undefined && !name)
    throw new Error("Display name cannot be empty.")
  if (values["new-email"] !== undefined && !newEmail)
    throw new Error("New email cannot be empty.")
  const password = values["password-env"]
    ? requireEnv(values["password-env"])
    : undefined
  if (password && password.length < 12)
    throw new Error("Password must be at least 12 characters.")

  const admin = createSupabaseAdminClient()
  const id = await findUserByEmail(admin, email)
  if (!id) throw new Error(`No existing user found for ${email}.`)

  const { error } = await admin.auth.admin.updateUserById(id, {
    ...(newEmail ? { email: newEmail, email_confirm: true } : {}),
    ...(password ? { password } : {}),
    ...(name ? { user_metadata: { display_name: name } } : {}),
  })
  if (error) throw error

  if (name) {
    const { data, error: profileError } = await admin
      .from("profile")
      .update({ display_name: name })
      .eq("id", id)
      .select("id")
      .single()
    if (profileError || !data)
      throw new Error(
        `Auth updated, but the profile name was not saved. Rerun with --email "${newEmail ?? email}" and --name to retry the name change.`
      )
  }
  console.log(`✔ Updated ${newEmail ?? email}; user ID ${id} preserved.`)
}

main().catch((error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
