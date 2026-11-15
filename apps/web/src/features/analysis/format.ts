import type { Figure } from "@/lib/calc/types"
import { formatDate } from "@/lib/format/date"
import { formatMoney, formatMoneyDelta } from "@/lib/format/money"
import { formatPercent } from "@/lib/format/percent"
import type { InputDef } from "@/lib/inputs/registry"

export function formatMonths(months: number): string {
  return `${months} ${months === 1 ? "month" : "months"}`
}

export function formatFigureValue(
  figure: Pick<Figure, "unit" | "value">,
  opts: { signed?: boolean } = {}
): string {
  switch (figure.unit) {
    case "pence":
      return opts.signed
        ? formatMoneyDelta(figure.value)
        : formatMoney(figure.value)
    case "ratio":
      return formatPercent(figure.value, 1)
    case "multiple":
      return formatPercent(figure.value, 0)
    case "months":
      return formatMonths(figure.value)
    case "flag":
      return figure.value ? "Yes" : "No"
  }
}

export type ProductLabel = { id: string; lender: string; name: string }

export function formatInputValue(
  def: InputDef,
  value: unknown,
  products: readonly ProductLabel[] = []
): string {
  if (value === null || value === undefined)
    return def.kind === "product" ? "None" : "—"
  switch (def.kind) {
    case "money":
      return formatMoney(value as number)
    case "ratio":
      return formatPercent(value as number, 2)
    case "months":
      return formatMonths(value as number)
    case "boolean":
      return value ? "Yes" : "No"
    case "enum":
      return def.options?.[value as string] ?? String(value)
    case "date":
      return formatDate(value as string)
    case "product": {
      const product = products.find((p) => p.id === value)
      return product
        ? `${product.lender} · ${product.name}`
        : "Product not found"
    }
  }
}
