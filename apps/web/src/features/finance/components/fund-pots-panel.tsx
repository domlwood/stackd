"use client"

import { useOptimistic, useState } from "react"
import { ChevronRightIcon, PiggyBankIcon, PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"

import { PagePlaceholder } from "@/components/blocks/page-placeholder"
import { formatMoney } from "@/lib/format/money"
import type { Member } from "@/features/workspace/queries"
import { FUND_POT_KIND_LABELS, type FundPot } from "../schemas"
import { FundPotSheet } from "./fund-pot-sheet"

type Action = { type: "save"; pot: FundPot } | { type: "delete"; id: string }

function reducer(pots: FundPot[], action: Action): FundPot[] {
  if (action.type === "delete") return pots.filter((p) => p.id !== action.id)
  const exists = pots.some((p) => p.id === action.pot.id)
  return exists
    ? pots.map((p) => (p.id === action.pot.id ? action.pot : p))
    : [...pots, action.pot]
}

export function FundPotsPanel({
  pots,
  members,
}: {
  pots: FundPot[]
  members: Member[]
}) {
  const [optimisticPots, apply] = useOptimistic(pots, reducer)
  const [editing, setEditing] = useState<FundPot | null>(null)
  const [open, setOpen] = useState(false)
  const nameOf = (id: string) =>
    members.find((m) => m.userId === id)?.displayName ?? "Unknown"
  const total = optimisticPots.reduce((sum, p) => sum + p.amountPence, 0)

  const openSheet = (pot: FundPot | null) => {
    setEditing(pot)
    setOpen(true)
  }

  return (
    <section
      aria-labelledby="fund-pots-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="fund-pots-heading" className="text-base font-medium">
          Fund pots
        </h2>
        <Button size="sm" onClick={() => openSheet(null)}>
          <PlusIcon aria-hidden />
          Add pot
        </Button>
      </div>

      {optimisticPots.length === 0 ? (
        <PagePlaceholder
          icon={PiggyBankIcon}
          title="No fund pots yet"
          description="Add savings, contributions or equity release so we can work out what you can afford."
        >
          <Button onClick={() => openSheet(null)}>
            <PlusIcon aria-hidden />
            Add your first pot
          </Button>
        </PagePlaceholder>
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y">
            {optimisticPots.map((pot) => (
              <li key={pot.id}>
                <button
                  type="button"
                  onClick={() => openSheet(pot)}
                  aria-label={`Edit ${pot.name}`}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none data-[optimistic=true]:opacity-60"
                  data-optimistic={pot.id.startsWith("optimistic-")}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{pot.name}</div>
                    <div className="truncate text-sm text-muted-foreground">
                      {FUND_POT_KIND_LABELS[pot.kind]} ·{" "}
                      {nameOf(pot.ownerUserId)}
                    </div>
                  </div>
                  <div className="num font-medium">
                    {formatMoney(pot.amountPence)}
                  </div>
                  <ChevronRightIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3 pr-11 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="num font-semibold">{formatMoney(total)}</span>
          </div>
        </Card>
      )}

      <FundPotSheet
        open={open}
        onOpenChange={setOpen}
        pot={editing}
        members={members}
        onOptimisticSave={(pot) => apply({ type: "save", pot })}
        onOptimisticDelete={(id) => apply({ type: "delete", id })}
      />
    </section>
  )
}
