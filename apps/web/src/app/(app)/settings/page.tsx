import type { Metadata } from "next"

import { SettingsForm } from "@/features/settings/components/settings-form"
import { getSettings } from "@/features/workspace/queries"

export const metadata: Metadata = { title: "Settings" }

/** Reached from the profile menu. Shared by everyone in the workspace. */
export default async function SettingsPage() {
  const settings = await getSettings()
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <SettingsForm initial={settings} />
    </div>
  )
}
