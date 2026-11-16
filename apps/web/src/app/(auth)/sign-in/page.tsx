import type { Metadata } from "next"

import { SignInForm } from "@/features/auth/components/sign-in-form"
import { DealframeLockup } from "@/components/brand/logo"

export const metadata: Metadata = { title: "Sign in" }

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const { next } = await searchParams
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <main className="flex w-full max-w-sm flex-col gap-6">
        <div className="self-center">
          <DealframeLockup markClassName="size-7" />
        </div>
        <SignInForm next={typeof next === "string" ? next : undefined} />
      </main>
    </div>
  )
}
