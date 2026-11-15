import type { ReactNode } from "react"

import { AppShell } from "@/components/blocks/app-shell"
import { requireSession } from "@/lib/auth/session"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession()
  return (
    <AppShell
      user={{ name: session.displayName, email: session.email }}
      workspaceName={session.workspaceName}
    >
      {children}
    </AppShell>
  )
}
