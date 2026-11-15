"use client"

import { useActionState } from "react"
import { CircleAlertIcon } from "lucide-react"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"

import { signIn } from "../actions"
import type { SignInState } from "../schemas"

const INITIAL_STATE: SignInState = { status: "idle" }

/** Sign-in card adapted from shadcn `login-03`: email + password only, no sign-up. */
export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, INITIAL_STATE)

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>
          Invite only. Use the account you were given.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} noValidate>
          <input type="hidden" name="next" value={next ?? ""} />
          <FieldGroup>
            {state.message ? (
              <Alert variant="destructive" aria-live="polite">
                <CircleAlertIcon />
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}
            <Field
              data-invalid={Boolean(state.fieldErrors?.email) || undefined}
            >
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.email}
                aria-invalid={Boolean(state.fieldErrors?.email) || undefined}
                required
              />
              <FieldError>{state.fieldErrors?.email}</FieldError>
            </Field>
            <Field
              data-invalid={Boolean(state.fieldErrors?.password) || undefined}
            >
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(state.fieldErrors?.password) || undefined}
                required
              />
              <FieldError>{state.fieldErrors?.password}</FieldError>
            </Field>
            <Field>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null}
                {pending ? "Signing in…" : "Sign in"}
              </Button>
              <FieldDescription className="text-center">
                Forgotten your password? Ask your partner to reset it from the
                Supabase dashboard.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
