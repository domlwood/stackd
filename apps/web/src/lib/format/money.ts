/** Money is always integer pence in storage and calculation. */
export type Pence = number

export const PENCE_PER_POUND = 100

const headlineFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

const exactFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compactFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

export type MoneyFormat = "headline" | "exact" | "compact"

/**
 * Formats pence as GBP. "headline" drops pennies (rounded half away from zero),
 * "exact" shows pennies, "compact" gives £245k / £1.2M for tight spaces.
 */
export function formatMoney(
  pence: Pence,
  format: MoneyFormat = "headline"
): string {
  if (!Number.isFinite(pence)) return "—"
  const pounds = pence / PENCE_PER_POUND
  switch (format) {
    case "exact":
      return exactFormatter.format(pounds)
    case "compact":
      return compactFormatter.format(pounds)
    case "headline":
      return headlineFormatter.format(
        Math.sign(pounds) * Math.round(Math.abs(pounds))
      )
  }
}

/** Signed variant for deltas: "+£1,200" / "−£800" (true minus sign). */
export function formatMoneyDelta(
  pence: Pence,
  format: MoneyFormat = "headline"
): string {
  if (!Number.isFinite(pence)) return "—"
  if (pence === 0) return formatMoney(0, format)
  const body = formatMoney(Math.abs(pence), format)
  return pence > 0 ? `+${body}` : `−${body}`
}

/** Parses user-entered pounds ("£245,000", "245k", "1.2m", "99.50") into pence. */
export function parseMoneyInput(raw: string): Pence | null {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[£,\s]/g, "")
  const match = /^(-?\d+(?:\.\d+)?)([km]?)$/.exec(cleaned)
  if (!match) return null
  const [, amount = "", suffix] = match
  const multiplier = suffix === "m" ? 1_000_000 : suffix === "k" ? 1_000 : 1
  return Math.round(Number(amount) * multiplier * PENCE_PER_POUND)
}

export function poundsToPence(pounds: number): Pence {
  return Math.round(pounds * PENCE_PER_POUND)
}
