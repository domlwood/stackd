import "server-only"

import { redirect } from "next/navigation"
import { cache } from "react"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export type SessionContext = {
  userId: string
  email: string
  displayName: string
  workspaceId: string
  workspaceName: string
}

/**
 * Resolves the signed-in user and their workspace. Cached per request.
 * Redirects to sign-in when there is no session; throws when the user has no
 * workspace (an operator error: run `npm run user:create`).
 */
export const requireSession = cache(async (): Promise<SessionContext> => {
  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect("/sign-in")

  const { data: membership, error } = await supabase
    .from("workspace_member")
    .select(
      "workspace_id, workspace:workspace_id(name), profile:user_id(display_name)"
    )
    .eq("user_id", auth.user.id)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Could not load your workspace: ${error.message}`)
  if (!membership) {
    throw new Error(
      "Your account isn't linked to a workspace yet. Ask the workspace owner to add you."
    )
  }

  return {
    userId: auth.user.id,
    email: auth.user.email ?? "",
    displayName: membership.profile?.display_name ?? auth.user.email ?? "You",
    workspaceId: membership.workspace_id,
    workspaceName: membership.workspace?.name ?? "Workspace",
  }
})
