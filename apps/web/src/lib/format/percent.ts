/** Rates are stored as fractions: 0.055 means 5.5%. */
export type Ratio = number

export function formatPercent(ratio: Ratio, fractionDigits = 1): string {
  if (!Number.isFinite(ratio)) return ratio > 0 ? "∞" : "—"
  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(ratio)
}

export function parsePercentInput(raw: string): Ratio | null {
  const cleaned = raw.trim().replace(/[%\s]/g, "")
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null
  return Number(cleaned) / 100
}
