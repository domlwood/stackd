import type { PostgrestError } from "@supabase/supabase-js"
import type { z } from "zod"

export type FieldErrors = Record<string, string>

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; message: string; fieldErrors?: FieldErrors }

/** Postgres / PostgREST error codes → plain-language messages for users. */
const DB_MESSAGES: Record<string, string> = {
  "42501": "You don't have permission to do that.",
  "23505": "That already exists.",
  "23503": "That's still in use elsewhere, so it can't be removed.",
  "23514":
    "Some values are out of the allowed range. Check the highlighted fields.",
  "23502": "A required value is missing.",
  P0002:
    "We couldn't find that record. It may have been removed.",
  PGRST116:
    "We couldn't find that record. It may have been removed.",
}

export function dbErrorMessage(
  error: Pick<PostgrestError, "code" | "message">
): string {
  return (
    DB_MESSAGES[error.code] ??
    "Something went wrong saving that. Please try again."
  )
}

export function fail(
  message: string,
  fieldErrors?: FieldErrors
): { ok: false; message: string; fieldErrors?: FieldErrors } {
  return fieldErrors
    ? { ok: false, message, fieldErrors }
    : { ok: false, message }
}

export function fromDbError(error: Pick<PostgrestError, "code" | "message">) {
  console.error("[db]", error.code, error.message)
  return fail(dbErrorMessage(error))
}

/** Flattens zod issues to { "path.to.field": "first message" }. */
export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".")
    out[key] ??= issue.message
  }
  return out
}

export function fromZodError(error: z.ZodError) {
  return fail("Please fix the highlighted fields.", zodFieldErrors(error))
}
