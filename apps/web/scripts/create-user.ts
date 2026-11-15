/**
 * Invite-only account creation (public sign-up is disabled).
 *   npm run user:create -- --email a@b.com --name "Alex" --password '…'
 * Adds the user to the workspace (created if none exists).
 */
import { parseArgs } from "node:util"

import { DEFAULT_WORKSPACE_NAME } from "@/lib/app"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { addMember, ensureWorkspace, upsertUser } from "./lib"

const MIN_PASSWORD_LENGTH = 12

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      password: { type: "string" },
      workspace: {
        type: "string",
        default: process.env.SEED_WORKSPACE_NAME ?? DEFAULT_WORKSPACE_NAME,
      },
    },
  })
  if (!values.email || !values.name || !values.password) {
    throw new Error(
      'Usage: npm run user:create -- --email <email> --name "<name>" --password <password>'
    )
  }
  if (values.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    )
  }

  const admin = createSupabaseAdminClient()
  const userId = await upsertUser(admin, {
    email: values.email,
    password: values.password,
    displayName: values.name,
  })
  const workspaceId = await ensureWorkspace(
    admin,
    values.workspace ?? DEFAULT_WORKSPACE_NAME
  )
  await addMember(admin, workspaceId, userId)
  console.log(`✔ ${values.email} can sign in (workspace ${workspaceId}).`)
}

main().catch((error: unknown) => {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
