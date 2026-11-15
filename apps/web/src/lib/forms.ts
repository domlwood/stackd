import type { FieldValues, Path, UseFormSetError } from "react-hook-form"

import type { FieldErrors } from "@/lib/errors"

/** Pushes server-side validation errors back onto react-hook-form fields. */
export function applyServerFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors: FieldErrors | undefined
) {
  if (!fieldErrors) return
  for (const [path, message] of Object.entries(fieldErrors)) {
    setError(path as Path<T>, { type: "server", message })
  }
}
