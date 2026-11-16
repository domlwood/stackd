"use client"

import Link from "next/link"
import type { Route } from "next"
import { CircleAlertIcon, HouseIcon, MoveRightIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { VerdictBadge } from "@/components/blocks/verdict-badge"
import { formatMoney } from "@/lib/format/money"
import type { PortfolioDeal } from "../portfolio"
import { DEAL_STATUSES, DEAL_STATUS_LABELS, type DealStatus } from "../schemas"

/**
 * DealCard — pipeline card: photo, address, price, verdict, flip profit, money left in, affordability.
 * The whole card links to the deal; "Move to…" changes status without dragging (keyboard and touch friendly).
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
            href={`/deals/${deal.id}#top` as Route}
            prefetch={false}
            className="line-clamp-2 text-sm leading-snug font-medium after:absolute after:inset-0 focus-visible:outline-none"
          >
            {deal.addressLine}
          </Link>
          <div className="text-xs text-muted-foreground tabular-nums">
            {[
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
          <dt className="text-muted-foreground">Flip profit</dt>
          <dd className="num font-medium">
            {s.flipProfitPence === null ? "—" : formatMoney(s.flipProfitPence)}
          </dd>
          <dt className="text-muted-foreground">Money left in</dt>
          <dd className="num font-medium">
            {s.moneyLeftInPence === null
              ? "—"
              : formatMoney(Math.max(0, s.moneyLeftInPence))}
          </dd>
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
                aria-label={`Move ${deal.addressLine}`}
              />
            }
          >
            <MoveRightIcon aria-hidden />
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}
