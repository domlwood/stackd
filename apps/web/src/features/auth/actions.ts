"use server"

import type { Route } from "next"
import { redirect } from "next/navigation"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { safeRedirectPath, signInSchema, type SignInState } from "./schemas"

export async function signIn(
  _previous: SignInState,
  formData: FormData
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  })

  const email =
    typeof formData.get("email") === "string"
      ? String(formData.get("email"))
      : ""

  if (!parsed.success) {
    const fieldErrors: SignInState["fieldErrors"] = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === "email" || field === "password")
        fieldErrors[field] ??= issue.message
    }
    return { status: "error", fieldErrors, email }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Deliberately vague: don't reveal whether the account exists.
    return {
      status: "error",
      message: "That email and password don't match an account.",
      email,
    }
  }

  redirect(safeRedirectPath(parsed.data.next) as Route)
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/sign-in")
}
