"use client"

import Link from "next/link"
import type { Route } from "next"
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CircleAlertIcon,
  EllipsisVerticalIcon,
  HouseIcon,
  LinkIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { VerdictBadge } from "@/components/blocks/verdict-badge"
import { formatMoney } from "@/lib/format/money"
import type { PortfolioDeal } from "../portfolio"
import { DEAL_STATUSES, DEAL_STATUS_LABELS, type DealStatus } from "../schemas"
import { toggleArchive } from "./archive"
import { copyDealLink } from "./copy-link"

/**
 * DealCard — deal grid card: photo, address, status, price, verdict, profit, money left in or cash needed, affordability.
 * The whole card links to the deal; its menu changes status or archives it.
 */
export function DealCard({
  deal,
  onMove,
}: {
  deal: PortfolioDeal
  onMove: (status: DealStatus) => void
}) {
  const s = deal.summary
  return (
    <Card
      size="sm"
      className="relative gap-2 px-3 transition-shadow focus-within:ring-2 focus-within:ring-ring hover:shadow-md"
    >
      <div className="flex gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
          {deal.coverPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote listing photos, not optimised
            <img
              src={deal.coverPhotoUrl}
              alt=""
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <HouseIcon className="size-5 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={`/deals/${deal.id}` as Route}
            prefetch={false}
            className="line-clamp-2 text-sm leading-snug font-medium after:absolute after:inset-0 focus-visible:outline-none"
          >
            {deal.addressLine}
          </Link>
          <div className="text-xs text-muted-foreground tabular-nums">
            {[
              DEAL_STATUS_LABELS[deal.status],
              deal.postcode,
              deal.askingPricePence !== null
                ? formatMoney(deal.askingPricePence)
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
      </div>
      {s.error ? (
        <p className="flex items-center gap-1 text-xs text-warning-foreground">
          <CircleAlertIcon className="size-3.5" aria-hidden /> Can&apos;t
          analyse yet
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-2 text-xs">
          <dt className="text-muted-foreground">Profit</dt>
          <dd className="num font-medium">
            {s.flipProfitPence === null ? "—" : formatMoney(s.flipProfitPence)}
          </dd>
          {/* BRR deals show money left in; sale-only plans show the cash needed. */}
          {s.moneyLeftInPence !== null ? (
            <>
              <dt className="text-muted-foreground">Money left in</dt>
              <dd className="num font-medium">
                {formatMoney(Math.max(0, s.moneyLeftInPence))}
              </dd>
            </>
          ) : (
            <>
              <dt className="text-muted-foreground">Cash needed</dt>
              <dd className="num font-medium">
                {s.cashRequiredPence === null
                  ? "—"
                  : formatMoney(s.cashRequiredPence)}
              </dd>
            </>
          )}
        </dl>
      )}
      <div className="relative z-10 flex items-center gap-1.5">
        <VerdictBadge level={s.verdict} />
        {s.affordable === false ? (
          <Badge
            variant="outline"
            className="border-negative/40 text-negative-foreground"
          >
            Short {formatMoney(s.shortfallPence ?? 0)}
          </Badge>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto"
                aria-label={`Actions for ${deal.addressLine}`}
              />
            }
          >
            <EllipsisVerticalIcon aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {DEAL_STATUSES.filter((st) => st !== deal.status).map((st) => (
                <DropdownMenuItem key={st} onClick={() => onMove(st)}>
                  {DEAL_STATUS_LABELS[st]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void copyDealLink(deal.id)}>
              <LinkIcon aria-hidden />
              Copy link
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => void toggleArchive(deal.id, !deal.archivedAt)}
            >
              {deal.archivedAt ? (
                <ArchiveRestoreIcon aria-hidden />
              ) : (
                <ArchiveIcon aria-hidden />
              )}
              {deal.archivedAt ? "Restore" : "Archive"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}
