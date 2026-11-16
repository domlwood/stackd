"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
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
import { useDeal } from "@/features/analysis/components/deal-provider"
import { deleteDeal } from "../actions"
import { PROPERTY_TYPE_LABELS } from "../schemas"
import { StatusControl } from "./status-control"

export function DealHeader() {
  const { data } = useDeal()
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
        Pipeline
      </Link>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl leading-tight font-semibold text-balance">
            {deal.addressLine}
          </h2>
          {facts.length ? (
            <p className="text-sm text-muted-foreground">{facts.join(" · ")}</p>
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
            {deal.listingUrl ? <DropdownMenuSeparator /> : null}
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
        description="This permanently removes the deal, its numbers and refurb lines. If you've just decided against it, move it to Passed instead."
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
