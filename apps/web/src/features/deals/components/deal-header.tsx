"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { ConfirmDialog } from "@/components/blocks/confirm-dialog"
import { useDealBase } from "@/features/analysis/components/deal-provider"
import { deleteDeal } from "../actions"
import { PROPERTY_TYPE_LABELS } from "../schemas"
import { toggleArchive } from "./archive"
import { StatusControl } from "./status-control"

export function DealHeader() {
  const { data } = useDealBase()
  const { deal } = data
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [pending, startTransition] = useTransition()
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
          {facts.length ? (
            <p className="text-sm text-muted-foreground">{facts.join(" · ")}</p>
          ) : null}
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
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Deal actions" />
            }
          >
            <EllipsisVerticalIcon aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            {deal.listingUrl ? (
              <DropdownMenuItem
                render={
                  <a href={deal.listingUrl} target="_blank" rel="noreferrer" />
                }
              >
                <ExternalLinkIcon aria-hidden />
                Open listing
              </DropdownMenuItem>
            ) : null}
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
      <StatusControl dealId={deal.id} status={deal.status} />
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
