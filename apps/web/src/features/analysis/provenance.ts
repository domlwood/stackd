import { inputDef } from "@/lib/inputs/registry"
import type { Provenance } from "@/lib/inputs/resolve"

/**
 * Where a number came from (docs/APP_FEEL_AND_FLOW.md §4 Step C). Shown beside
 * every input so imported facts, estimates and your own figures look different.
 */
export type ProvenanceTag =
  "imported" | "estimated" | "preset" | "yours" | "proposed" | "missing"

export const PROVENANCE_LABELS: Record<ProvenanceTag, string> = {
  imported: "Imported",
  estimated: "Estimated",
  preset: "Preset",
  yours: "Your assumption",
  proposed: "Proposed",
  missing: "Missing",
}

/** Spoken after the value for screen readers, and used as the chip's title. */
export const PROVENANCE_DESCRIPTIONS: Record<ProvenanceTag, string> = {
  imported: "Imported from the listing",
  estimated: "Estimated. Review before relying on this figure",
  preset: "From your default assumptions",
  yours: "Set by you",
  proposed: "Your proposal, not yet agreed",
  missing: "Not provided yet",
}

/** The numbers a verdict can't be trusted without, in the order we ask for them. */
export const VERDICT_DETAIL_KEYS = [
  "purchase.price",
  "refurb.budget",
  "exit.gdv",
] as const

const DETAIL_NAMES: Record<(typeof VERDICT_DETAIL_KEYS)[number], string> = {
  "purchase.price": "offer price",
  "refurb.budget": "refurb cost",
  "exit.gdv": "end value",
}

/** Which verdict-critical numbers are still missing (placeholders, not your figures). */
export function missingDetails(
  provenance: Record<string, Provenance | undefined>,
  values: Record<string, unknown>,
  facts: { askingPricePence: number | null; refurbLineCount: number }
): (typeof VERDICT_DETAIL_KEYS)[number][] {
  return VERDICT_DETAIL_KEYS.filter(
    (key) => provenanceTag(key, provenance[key], values, facts) === "missing"
  )
}

/** "Add your end value and refurb cost to see whether it stacks." */
export function missingDetailsReason(
  keys: readonly (typeof VERDICT_DETAIL_KEYS)[number][]
): string {
  const names = [...keys].reverse().map((k) => DETAIL_NAMES[k])
  const list =
    names.length <= 1
      ? (names[0] ?? "")
      : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
  return `Add your ${list} to see whether it stacks.`
}

export function provenanceTag(
  key: string,
  provenance: Provenance | undefined,
  values: Record<string, unknown>,
  facts: { askingPricePence: number | null; refurbLineCount: number }
): ProvenanceTag | null {
  if (!provenance) return null
  if (provenance.origin === "proposal") return "proposed"
  if (provenance.origin === "agreed") return "yours"

  // Defaults. A placeholder the analysis can't do without counts as missing.
  if (key === "purchase.price")
    return facts.askingPricePence ? "imported" : "missing"
  if (key === "exit.gdv") return "missing" // defaults to the asking price
  if (
    key === "refurb.budget" &&
    facts.refurbLineCount === 0 &&
    !values["refurb.budget"]
  )
    return "missing"
  if (provenance.derived && inputDef(key)?.estimate) return "estimated"
  return "preset"
}
