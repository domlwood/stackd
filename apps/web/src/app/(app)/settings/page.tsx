import type { Metadata } from "next"
import { Settings2Icon } from "lucide-react"

import { PagePlaceholder } from "@/components/blocks/page-placeholder"

export const metadata: Metadata = { title: "Settings" }

export default function SettingsPage() {
  return (
    <PagePlaceholder
      icon={Settings2Icon}
      title="Settings"
      description="Your buy box, default assumptions and tax rules will live here."
    />
  )
}
