import { daysBetween } from "@/lib/format/date"
import type { Pence } from "@/lib/format/money"
import type { FinanceProduct } from "./schemas"

export type Staleness = { stale: boolean; daysSinceReview: number }

/** A product is stale once it hasn't been reviewed for more than `staleAfterDays`. */
export function productStaleness(
  lastReviewedAt: string,
  staleAfterDays: number,
  now: Date = new Date()
): Staleness {
  const daysSinceReview = Math.max(0, daysBetween(lastReviewedAt, now))
  return { stale: daysSinceReview > staleAfterDays, daysSinceReview }
}

export type Commitment = {
  dealId: string
  label: string
  cashRequiredPence: Pence
}

export type BuyingPower = {
  totalPotsPence: Pence
  committedPence: Pence
  freePence: Pence
  byOwner: { ownerUserId: string; totalPence: Pence }[]
  commitments: Commitment[]
}

/**
 * Free buying power = total of all fund pots − cash committed to active deals
 * (status offer / accepted). Can go negative (over-committed).
 */
export function computeBuyingPower(
  pots: readonly { ownerUserId: string; amountPence: Pence }[],
  commitments: readonly Commitment[]
): BuyingPower {
  const totalPotsPence = pots.reduce((sum, pot) => sum + pot.amountPence, 0)
  const committedPence = commitments.reduce(
    (sum, c) => sum + c.cashRequiredPence,
    0
  )

  const owners = new Map<string, Pence>()
  for (const pot of pots)
    owners.set(
      pot.ownerUserId,
      (owners.get(pot.ownerUserId) ?? 0) + pot.amountPence
    )

  return {
    totalPotsPence,
    committedPence,
    freePence: totalPotsPence - committedPence,
    byOwner: [...owners].map(([ownerUserId, totalPence]) => ({
      ownerUserId,
      totalPence,
    })),
    commitments: [...commitments],
  }
}

/** Affordability of a single deal against free buying power. */
export function affordability(freePence: Pence, cashRequiredPence: Pence) {
  const shortfallPence = Math.max(0, cashRequiredPence - freePence)
  return { affordable: shortfallPence === 0, shortfallPence }
}

/** One-line summary of a product's key terms, e.g. "5.49% fixed 24m · 75% LTV · £1,999 fee". */
export function productTermsSummary(
  product: Pick<
    FinanceProduct,
    | "type"
    | "rate"
    | "rateType"
    | "fixedMonths"
    | "maxLtv"
    | "monthlyRate"
    | "interestMode"
    | "arrangementFeeKind"
    | "arrangementFeePence"
    | "arrangementFeePct"
    | "icrThreshold"
    | "stressRate"
  >,
  format: {
    money: (p: Pence) => string
    percent: (r: number, digits?: number) => string
  }
): string {
  const parts: string[] = []
  if (product.type === "cash") return "No borrowing"
  if (product.type === "bridging" && product.monthlyRate !== null) {
    parts.push(
      `${format.percent(product.monthlyRate, 2)}/month ${product.interestMode ?? ""}`.trim()
    )
  }
  if (
    (product.type === "residential" || product.type === "btl") &&
    product.rate !== null
  ) {
    const period =
      product.rateType === "fixed" && product.fixedMonths
        ? ` ${product.fixedMonths}m`
        : ""
    parts.push(
      `${format.percent(product.rate, 2)} ${product.rateType ?? ""}${period}`.trim()
    )
  }
  if (product.maxLtv !== null)
    parts.push(`${format.percent(product.maxLtv, 0)} LTV`)
  const fee =
    product.arrangementFeeKind === "pct"
      ? product.arrangementFeePct > 0
        ? `${format.percent(product.arrangementFeePct, 2)} fee`
        : null
      : product.arrangementFeePence > 0
        ? `${format.money(product.arrangementFeePence)} fee`
        : null
  if (fee) parts.push(fee)
  if (
    product.type === "btl" &&
    product.icrThreshold !== null &&
    product.stressRate !== null
  ) {
    parts.push(
      `ICR ${format.percent(product.icrThreshold, 0)} @ ${format.percent(product.stressRate, 2)}`
    )
  }
  return parts.join(" · ")
}
