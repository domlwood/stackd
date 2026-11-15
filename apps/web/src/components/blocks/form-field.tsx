/**
 * FormField — label + control + description + error, wired for a11y.
 *
 * Props: id, label, error?, description?, children (the control; give it the same id
 * and aria-invalid={!!error}), className?
 * Usage:
 *   <FormField id="name" label="Name" error={errors.name?.message}>
 *     <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
 *   </FormField>
 */
import type { ReactNode } from "react"

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field"

type FormFieldProps = {
  id: string
  label: string
  error?: string
  description?: ReactNode
  children: ReactNode
  className?: string
}

export function FormField({
  id,
  label,
  error,
  description,
  children,
  className,
}: FormFieldProps) {
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {description && !error ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
      <FieldError>{error}</FieldError>
    </Field>
  )
}
