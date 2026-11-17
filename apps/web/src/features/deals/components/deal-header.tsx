"use client"

import Link from "next/link"
import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  EyeIcon,
  HouseIcon,
  LinkIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { ConfirmDialog } from "@/components/blocks/confirm-dialog"
import { useDealBase } from "@/features/analysis/components/deal-provider"
import type { DealViewer } from "@/features/presence/types"
import type { Member } from "@/features/workspace/queries"
import { formatDateTime, formatRelative } from "@/lib/format/date"
import { deleteDeal } from "../actions"
import { PROPERTY_TYPE_LABELS } from "../schemas"
import { toggleArchive } from "./archive"
import { copyDealLink } from "./copy-link"
import { DEAL_STATUSES, DEAL_STATUS_LABELS } from "../schemas"
import { useStatusChange } from "./status-control"

function listingLabel(url: string): string {
  try {
    return new URL(url).hostname.includes("rightmove")
      ? "View on Rightmove"
      : "View listing"
  } catch {
    return "View listing"
  }
}

export function DealHeader({ viewers = [] }: { viewers?: DealViewer[] }) {
  const { data, memberName } = useDealBase()
  const { deal } = data
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [pending, startTransition] = useTransition()
  // Status is a quiet fact, changed from the menu (passing asks why).
  const status = useStatusChange(deal.id)
  const facts = [
    deal.postcode,
    deal.propertyType ? PROPERTY_TYPE_LABELS[deal.propertyType] : null,
    deal.beds !== null ? `${deal.beds} bed` : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/"
        className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:inline-flex"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        Deals
      </Link>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl leading-tight font-semibold text-balance">
            {deal.addressLine}
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {facts.length ? <span>{facts.join(" · ")}</span> : null}
            {deal.status !== "active" ? (
              <Badge variant="secondary">
                {DEAL_STATUS_LABELS[deal.status]}
              </Badge>
            ) : null}
          </p>
          <SeenBy viewers={viewers} members={data.members} name={memberName} />
          {deal.archivedAt ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <ArchiveIcon className="size-3.5" aria-hidden />
              Archived, so it&apos;s hidden from your deals.
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0"
                onClick={() => void toggleArchive(deal.id, false)}
              >
                Restore
              </Button>
            </p>
          ) : null}
          {deal.status === "passed" && deal.passedReason ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Passed: {deal.passedReason}
            </p>
          ) : null}
        </div>
        {/* Same height as the ⋮ button (h-10 on phones, h-8 from md). */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copy link to this deal"
            title="Copy link"
            onClick={() => void copyDealLink(deal.id)}
          >
            <LinkIcon aria-hidden />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Deal actions" />
              }
            >
              <EllipsisVerticalIcon aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Move to</DropdownMenuLabel>
                {DEAL_STATUSES.filter((st) => st !== deal.status).map((st) => (
                  <DropdownMenuItem
                    key={st}
                    disabled={status.pending}
                    onClick={() => status.request(st)}
                  >
                    {DEAL_STATUS_LABELS[st]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void toggleArchive(deal.id, !deal.archivedAt)}
              >
                {deal.archivedAt ? (
                  <ArchiveRestoreIcon aria-hidden />
                ) : (
                  <ArchiveIcon aria-hidden />
                )}
                {deal.archivedAt ? "Restore deal" : "Archive deal"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirm(true)}
              >
                <Trash2Icon aria-hidden />
                Delete deal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* The listing is where the details live: photos, floorplan, description. */}
      <div className="flex flex-wrap items-center gap-2">
        {deal.listingUrl ? (
          <Button
            className="max-sm:flex-1"
            render={
              <a href={deal.listingUrl} target="_blank" rel="noreferrer" />
            }
          >
            <ExternalLinkIcon aria-hidden />
            {listingLabel(deal.listingUrl)}
          </Button>
        ) : null}
        <Button
          variant="outline"
          className="max-sm:flex-1"
          render={<Link href={`/deals/${deal.id}/listing` as Route} />}
        >
          <HouseIcon aria-hidden />
          Property details
        </Button>
      </div>
      {status.dialog}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this deal?"
        description="This permanently removes the deal, its numbers and refurb lines. To just hide it, archive it instead; if you've decided against it, move it to Passed."
        confirmLabel="Delete deal"
        pending={pending}
        onConfirm={() =>
          startTransition(async () => {
            const result = await deleteDeal(deal.id)
            if (!result.ok) {
              toast.error(result.message)
              return
            }
            toast.success("Deal deleted")
            router.push("/")
          })
        }
      />
    </div>
  )
}

/** "Alex viewed 2h ago", by name, for everyone but you. */
function SeenBy({
  viewers,
  members,
  name,
}: {
  viewers: DealViewer[]
  members: Member[]
  name: (userId: string | null) => string
}) {
  const others = members.filter((m) => !m.isYou)
  if (others.length === 0) return null
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {others.map((m) => {
        const seen = viewers.find((v) => v.userId === m.userId)
        return (
          <span key={m.userId} className="inline-flex items-center gap-1">
            <EyeIcon className="size-3.5" aria-hidden />
            {seen ? (
              <>
                {name(m.userId)} viewed{" "}
                <time
                  dateTime={seen.lastSeenAt}
                  title={formatDateTime(seen.lastSeenAt)}
                >
                  {formatRelative(seen.lastSeenAt)}
                </time>
              </>
            ) : (
              <>{name(m.userId)} hasn&apos;t opened this yet</>
            )}
          </span>
        )
      })}
    </p>
  )
}
