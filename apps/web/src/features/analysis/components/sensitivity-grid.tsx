"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import { VerdictBadge } from "@/components/blocks/verdict-badge"
import type { SensitivityRow } from "@/lib/calc"
import { formatMoney, formatMoneyDelta } from "@/lib/format/money"

function Delta({ pence, invert }: { pence: number | null; invert?: boolean }) {
  if (pence === null) return <span className="text-muted-foreground">—</span>
  const good = invert ? pence < 0 : pence > 0
  return (
    <span
      className={cn(
        "text-xs",
        pence === 0
          ? "text-muted-foreground"
          : good
            ? "text-positive-foreground"
            : "text-negative-foreground"
      )}
    >
      {formatMoneyDelta(pence)}
    </span>
  )
}

/** What-if grid: impact of common risks on flip profit, money left in and cashflow. */
export function SensitivityGrid({ rows }: { rows: SensitivityRow[] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <Table className="min-w-[36rem]">
        <TableHeader>
          <TableRow>
            <TableHead>Scenario</TableHead>
            <TableHead className="text-right">Flip profit</TableHead>
            <TableHead className="text-right">Money left in</TableHead>
            <TableHead className="text-right">Cashflow / month</TableHead>
            <TableHead>Verdict</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell className="num">
                <div>{formatMoney(row.flipProfitPence)}</div>
                <Delta pence={row.flipProfitDeltaPence} />
              </TableCell>
              <TableCell className="num">
                <div>
                  {row.moneyLeftInPence === null
                    ? "—"
                    : formatMoney(row.moneyLeftInPence)}
                </div>
                <Delta pence={row.moneyLeftInDeltaPence} invert />
              </TableCell>
              <TableCell className="num">
                <div>
                  {row.cashflowPence === null
                    ? "—"
                    : formatMoney(row.cashflowPence)}
                </div>
                <Delta pence={row.cashflowDeltaPence} />
              </TableCell>
              <TableCell>
                <VerdictBadge level={row.verdict} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
