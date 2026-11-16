import type { Pence, Ratio } from "./types"

/** Rounds to whole pence, half away from zero (avoids -0). */
export function roundPence(value: number): Pence {
  const rounded = Math.sign(value) * Math.round(Math.abs(value))
  return rounded === 0 ? 0 : rounded
}

/** amount × rate, rounded to pence. */
export function pct(amount: Pence, rate: Ratio): Pence {
  return roundPence(amount * rate)
}

export function sum(values: readonly number[]): number {
  return values.reduce((total, v) => total + v, 0)
}

export const MONTHS_PER_YEAR = 12

/** Safe ratio: returns `fallback` when the denominator is not positive. */
export function ratioOf(
  numerator: number,
  denominator: number,
  fallback = Number.NaN
): number {
  return denominator > 0 ? numerator / denominator : fallback
}

/** Flips a figure's sign for use as a deduction, recursively, so its working stays additive. */
export function negate<T extends { value: number; children?: T[] }>(
  figure: T
): T {
  return {
    ...figure,
    value: figure.value === 0 ? 0 : -figure.value,
    ...(figure.children ? { children: figure.children.map(negate) } : {}),
  }
}
