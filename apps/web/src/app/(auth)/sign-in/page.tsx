import type { Metadata } from "next"
import { LayersIcon } from "lucide-react"

import { SignInForm } from "@/features/auth/components/sign-in-form"
import { APP_NAME } from "@/lib/app"

export const metadata: Metadata = { title: "Sign in" }

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const { next } = await searchParams
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <main className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LayersIcon className="size-4" aria-hidden />
          </div>
          {APP_NAME}
        </div>
        <SignInForm next={typeof next === "string" ? next : undefined} />
      </main>
    </div>
  )
}
