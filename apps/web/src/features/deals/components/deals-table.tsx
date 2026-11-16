"use client"

import Link from "next/link"
import type { Route } from "next"
import { useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDownIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
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
import { formatMoney } from "@/lib/format/money"
import { formatPercent } from "@/lib/format/percent"
import type { PortfolioDeal } from "../portfolio"
import { DEAL_STATUSES, DEAL_STATUS_LABELS } from "../schemas"

const VERDICT_ORDER = { stacks: 0, marginal: 1, doesnt_stack: 2 } as const
const money = (v: number | null) => (v === null ? "—" : formatMoney(v))

const COLUMNS: ColumnDef<PortfolioDeal>[] = [
  {
    id: "address",
    header: "Address",
    accessorKey: "addressLine",
    cell: ({ row }) => (
      <Link
        href={`/deals/${row.original.id}#top` as Route}
        prefetch={false}
        className="font-medium hover:underline"
      >
        {row.original.addressLine}
        {row.original.postcode ? (
          <span className="block text-xs font-normal text-muted-foreground">
            {row.original.postcode}
          </span>
        ) : null}
      </Link>
    ),
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (d) => DEAL_STATUSES.indexOf(d.status),
    cell: ({ row }) => DEAL_STATUS_LABELS[row.original.status],
  },
  {
    id: "verdict",
    header: "Verdict",
    accessorFn: (d) =>
      d.summary.verdict ? VERDICT_ORDER[d.summary.verdict] : 9,
    cell: ({ row }) => <VerdictBadge level={row.original.summary.verdict} />,
  },
  {
    id: "price",
    header: "Asking",
    accessorFn: (d) => d.askingPricePence ?? -1,
    cell: ({ row }) => money(row.original.askingPricePence),
    meta: { numeric: true },
  },
  {
    id: "flip",
    header: "Flip profit",
    accessorFn: (d) => d.summary.flipProfitPence ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => money(row.original.summary.flipProfitPence),
    meta: { numeric: true },
  },
  {
    id: "roi",
    header: "ROI",
    accessorFn: (d) => d.summary.flipRoi ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) =>
      row.original.summary.flipRoi === null
        ? "—"
        : formatPercent(row.original.summary.flipRoi),
    meta: { numeric: true },
  },
  {
    id: "mli",
    header: "Money left in",
    accessorFn: (d) => d.summary.moneyLeftInPence ?? Number.POSITIVE_INFINITY,
    cell: ({ row }) =>
      money(
        row.original.summary.moneyLeftInPence === null
          ? null
          : Math.max(0, row.original.summary.moneyLeftInPence)
      ),
    meta: { numeric: true },
  },
  {
    id: "cashflow",
    header: "Cashflow",
    accessorFn: (d) =>
      d.summary.monthlyCashflowPence ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => money(row.original.summary.monthlyCashflowPence),
    meta: { numeric: true },
  },
  {
    id: "cash",
    header: "Cash needed",
    accessorFn: (d) => d.summary.cashRequiredPence ?? -1,
    cell: ({ row }) => money(row.original.summary.cashRequiredPence),
    meta: { numeric: true },
  },
  {
    id: "afford",
    header: "Affordable",
    accessorFn: (d) =>
      d.summary.affordable === null ? 2 : d.summary.affordable ? 0 : 1,
    cell: ({ row }) =>
      row.original.summary.affordable === null ? (
        "—"
      ) : row.original.summary.affordable ? (
        <span className="text-positive-foreground">Yes</span>
      ) : (
        <span className="text-negative-foreground">
          Short {money(row.original.summary.shortfallPence)}
        </span>
      ),
  },
]

/** Sortable deals table (shadcn data-table pattern on TanStack Table). */
export function DealsTable({ deals }: { deals: PortfolioDeal[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "status", desc: false },
  ])
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table manages its own memoisation
  const table = useReactTable({
    data: deals,
    columns: COLUMNS,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <div className="min-w-[56rem] rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const numeric = (
                    header.column.columnDef.meta as
                      { numeric?: boolean } | undefined
                  )?.numeric
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(numeric && "text-right")}
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : "none"
                      }
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("-mx-2", numeric && "ml-auto flex")}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        <ArrowUpDownIcon
                          className="size-3.5 opacity-50"
                          aria-hidden
                        />
                      </Button>
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      (
                        cell.column.columnDef.meta as
                          { numeric?: boolean } | undefined
                      )?.numeric && "num"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
