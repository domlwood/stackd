import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"

type Admin = SupabaseClient<Database>

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value)
    throw new Error(`Missing env var ${name} (see apps/web/.env.example)`)
  return value
}

/** Creates the auth user, or updates name/password if the email already exists. */
export async function upsertUser(
  admin: Admin,
  input: { email: string; password: string; displayName: string }
): Promise<string> {
  const existing = await findUserByEmail(admin, input.email)
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing, {
      password: input.password,
      user_metadata: { display_name: input.displayName },
    })
    if (error) throw error
    await admin
      .from("profile")
      .update({ display_name: input.displayName })
      .eq("id", existing)
    return existing
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { display_name: input.displayName },
  })
  if (error || !data.user)
    throw error ?? new Error("createUser returned no user")
  return data.user.id
}

async function findUserByEmail(
  admin: Admin,
  email: string
): Promise<string | null> {
  const PAGE_SIZE = 200
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    })
    if (error) throw error
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    )
    if (match) return match.id
    if (data.users.length < PAGE_SIZE) return null
  }
}

/** Returns the single workspace, creating it on first run. */
export async function ensureWorkspace(
  admin: Admin,
  name: string
): Promise<string> {
  const { data: existing, error } = await admin
    .from("workspace")
    .select("id")
    .order("created_at")
    .limit(1)
  if (error) throw error
  if (existing[0]) return existing[0].id
  const { data, error: insertError } = await admin
    .from("workspace")
    .insert({ name })
    .select("id")
    .single()
  if (insertError) throw insertError
  return data.id
}

export async function addMember(
  admin: Admin,
  workspaceId: string,
  userId: string
): Promise<void> {
  const { error } = await admin
    .from("workspace_member")
    .upsert(
      { workspace_id: workspaceId, user_id: userId },
      { onConflict: "workspace_id,user_id", ignoreDuplicates: true }
    )
  if (error) throw error
}
