import { z } from "zod"

export const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
})

export type SignInState = {
  status: "idle" | "error"
  message?: string
  fieldErrors?: Partial<Record<"email" | "password", string>>
  email?: string
}

/** Only allow same-origin relative redirects after sign-in. */
export function safeRedirectPath(next: string | undefined): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  )
    return "/today"
  return next
}
