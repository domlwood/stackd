/**
 * PagePlaceholder — designed empty state for screens whose features land in a later phase.
 *
 * Props: icon (LucideIcon), title, description, children? (actions)
 * Usage: <PagePlaceholder icon={LandmarkIcon} title="No fund pots yet" description="…" />
 */
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"

type PagePlaceholderProps = {
  icon: LucideIcon
  title: string
  description: string
  children?: ReactNode
}

export function PagePlaceholder({
  icon: Icon,
  title,
  description,
  children,
}: PagePlaceholderProps) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  )
}
