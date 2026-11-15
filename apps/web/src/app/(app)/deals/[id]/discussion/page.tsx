import { MessagesSquareIcon } from "lucide-react"

import { PagePlaceholder } from "@/components/blocks/page-placeholder"

export default function DealDiscussionPage() {
  return (
    <PagePlaceholder
      icon={MessagesSquareIcon}
      title="No discussion yet"
      description="Threads on this deal and on individual numbers will appear here."
    />
  )
}
