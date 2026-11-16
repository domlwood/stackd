import type { FlipResult } from "./flip"
import type { KeepResult } from "./keep"
import type { BuyBox, Ratio } from "./types"

export type VerdictLevel = "stacks" | "marginal" | "doesnt_stack"

export type Criterion = {
  exit: "flip" | "keep"
  key: string
  label: string
  pass: boolean
  /** How far short, relative to the threshold (0 when passing). */
  shortfall: Ratio
}

export type Verdict = {
  level: VerdictLevel
  criteria: Criterion[]
  reasons: string[]
}

/** Relative shortfall for ≥ thresholds (higher is better). */
function atLeast(value: number, threshold: number): Ratio {
  if (value >= threshold) return 0
  if (threshold === 0) return Number.POSITIVE_INFINITY
  return Math.abs((threshold - value) / threshold)
}

/** Relative excess for ≤ thresholds (lower is better). */
function atMost(value: number, threshold: number): Ratio {
  if (value <= threshold) return 0
  if (threshold === 0) return Number.POSITIVE_INFINITY
  return (value - threshold) / threshold
}

/**
 * stacks       — at least one exit meets every buy-box criterion
 * marginal     — neither does, but one exit misses each criterion by ≤ tolerance
 * doesn't stack — otherwise
 */
export function verdict(
  flip: FlipResult,
  keep: KeepResult,
  buyBox: BuyBox
): Verdict {
  const money = (p: number) => `£${Math.round(p / 100).toLocaleString("en-GB")}`
  const criteria: Criterion[] = [
    // A zero ROI minimum means "profit only": the ROI test is dropped rather than trivially passed.
    ...(buyBox.minFlipRoi > 0
      ? [
          {
            exit: "flip" as const,
            key: "flip.roi",
            label: `Flip ROI ≥ ${+(buyBox.minFlipRoi * 100).toFixed(1)}%`,
            pass: flip.roi >= buyBox.minFlipRoi,
            shortfall: atLeast(flip.roi, buyBox.minFlipRoi),
          },
        ]
      : []),
    {
      exit: "flip",
      key: "flip.profit",
      label: `Flip profit ≥ ${money(buyBox.minFlipProfitPence)}`,
      pass: flip.profitPence >= buyBox.minFlipProfitPence,
      shortfall: atLeast(flip.profitPence, buyBox.minFlipProfitPence),
    },
  ]
  if (keep.available) {
    criteria.push(
      {
        exit: "keep",
        key: "keep.moneyLeftIn",
        label: `Money left in ≤ ${money(buyBox.maxMoneyLeftInPence)}`,
        pass: keep.moneyLeftInPence <= buyBox.maxMoneyLeftInPence,
        shortfall: atMost(keep.moneyLeftInPence, buyBox.maxMoneyLeftInPence),
      },
      {
        exit: "keep",
        key: "keep.cashflow",
        label: `Cashflow ≥ ${money(buyBox.minMonthlyCashflowPence)}/month`,
        pass: keep.monthlyCashflowPence >= buyBox.minMonthlyCashflowPence,
        shortfall: atLeast(
          keep.monthlyCashflowPence,
          buyBox.minMonthlyCashflowPence
        ),
      },
      {
        exit: "keep",
        key: "keep.icr",
        label: "Passes the lender's rental stress test",
        pass: keep.icrPass,
        shortfall: keep.icrPass ? 0 : Number.POSITIVE_INFINITY,
      }
    )
  }

  const exits = keep.available
    ? (["flip", "keep"] as const)
    : (["flip"] as const)
  const byExit = (exit: "flip" | "keep") =>
    criteria.filter((c) => c.exit === exit)
  const passingExits = exits.filter((exit) => byExit(exit).every((c) => c.pass))
  const nearExits = exits.filter((exit) =>
    byExit(exit).every((c) => c.pass || c.shortfall <= buyBox.marginalTolerance)
  )

  const level: VerdictLevel =
    passingExits.length > 0
      ? "stacks"
      : nearExits.length > 0
        ? "marginal"
        : "doesnt_stack"
  const reasons =
    level === "stacks"
      ? passingExits.map(
          (exit) => `${exit === "flip" ? "Flip" : "Keep"} meets your buy box`
        )
      : criteria.filter((c) => !c.pass).map((c) => `Misses: ${c.label}`)
  if (!keep.available) reasons.push(keep.reason)

  return { level, criteria, reasons }
}
