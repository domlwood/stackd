import { ENGLAND_RULES } from "@/lib/calc/rules/england-2026"
import { BRIDGE, BTL } from "@/lib/calc/fixtures"
import { refurbItemCostKey } from "@/lib/inputs/registry"
import type { StoredInput } from "@/lib/inputs/resolve"
import { DEFAULT_SETTINGS } from "@/features/settings/schemas"
import { buildAnalysis, summarise } from "./build"

const ITEM = "11111111-1111-4111-8111-111111111111"
const agreed = (key: string, value: unknown): StoredInput => ({
  key,
  value,
  scope: "agreed",
  userId: null,
  setBy: null,
  setAt: "2026-11-15T00:00:00Z",
})
const products = [
  { ...BRIDGE, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
  { ...BTL, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
]

const base = {
  deal: { askingPricePence: 20_000_000 },
  refurbLines: [{ id: ITEM, category: "Kitchen", description: "", ordinal: 0 }],
  products,
  ruleRecords: ENGLAND_RULES,
  settings: DEFAULT_SETTINGS,
  today: "2026-11-15",
  view: { kind: "agreed" } as const,
}

describe("buildAnalysis", () => {
  it("resolves stored inputs, picks products and runs the engine", () => {
    const built = buildAnalysis({
      ...base,
      stored: [
        agreed("purchaseFinance.product", products[0]?.id),
        agreed("keep.product", products[1]?.id),
        agreed(refurbItemCostKey(ITEM), 3_000_000),
        agreed("keep.rentMonthly", 150_000),
        agreed("exit.gdv", 30_000_000),
      ],
      freeBuyingPowerPence: 50_000_000,
    })
    if (!built.ok) throw new Error(built.message)
    expect(built.purchaseProduct?.type).toBe("bridging")
    expect(built.refiProduct?.type).toBe("btl")
    expect(built.analysis.affordability?.affordable).toBe(true)
    const summary = summarise(built)
    expect(summary.error).toBeNull()
    expect(summary.flipProfitPence).toBe(built.analysis.flip.profitPence)
    expect(summary.moneyLeftInPence).not.toBeNull()
  })

  it("reports a plain-language error when no tax rules cover the completion date", () => {
    const built = buildAnalysis({
      ...base,
      stored: [agreed("purchase.completionDate", "2031-01-01")],
    })
    expect(built.ok).toBe(false)
    if (!built.ok) expect(built.message).toMatch(/add tax rules for that date/)
    expect(summarise(built)).toMatchObject({
      verdict: null,
      error: expect.any(String),
    })
  })

  it("reports incomplete stored rules instead of crashing", () => {
    const broken = ENGLAND_RULES.map((r) =>
      r.kind === "sdlt"
        ? { ...r, data: { ...(r.data as object), firstTimeBuyer: undefined } }
        : r
    )
    const built = buildAnalysis({ ...base, ruleRecords: broken, stored: [] })
    expect(built.ok).toBe(false)
    if (!built.ok)
      expect(built.message).toMatch(/tax rules for this date are incomplete/)
  })

  it("an unknown product id is treated as no product", () => {
    const built = buildAnalysis({
      ...base,
      stored: [agreed("keep.product", "cccccccc-cccc-4ccc-8ccc-cccccccccccc")],
    })
    if (!built.ok) throw new Error()
    expect(built.analysis.keep.available).toBe(false)
  })
})

describe("needs details", () => {
  const noLines = { ...base, refurbLines: [] }

  it("a deal with no end value or refurb cost needs details, not 'doesn't stack'", () => {
    const built = buildAnalysis({ ...noLines, stored: [] })
    if (!built.ok) throw new Error(built.message)
    expect(built.missingDetails).toEqual(["refurb.budget", "exit.gdv"])
    expect(built.analysis.verdict.level).toBe("needs_details")
    expect(built.analysis.verdict.reasons).toEqual([
      "Add your end value and refurb cost to see whether it stacks.",
    ])
    expect(summarise(built).verdict).toBe("needs_details")
  })

  it("one missing number is enough to hold the verdict back", () => {
    const built = buildAnalysis({
      ...noLines,
      stored: [agreed("exit.gdv", 30_000_000)],
    })
    if (!built.ok) throw new Error(built.message)
    expect(built.missingDetails).toEqual(["refurb.budget"])
    expect(built.analysis.verdict.reasons).toEqual([
      "Add your refurb cost to see whether it stacks.",
    ])
  })

  it("an explicit £0 refurb counts as provided, and the real verdict returns", () => {
    const built = buildAnalysis({
      ...noLines,
      stored: [agreed("exit.gdv", 30_000_000), agreed("refurb.budget", 0)],
    })
    if (!built.ok) throw new Error(built.message)
    expect(built.missingDetails).toEqual([])
    expect(built.analysis.verdict.level).not.toBe("needs_details")
  })

  it("refurb line items count as a refurb cost", () => {
    const built = buildAnalysis({
      ...base,
      stored: [agreed("exit.gdv", 30_000_000)],
    })
    if (!built.ok) throw new Error(built.message)
    expect(built.missingDetails).toEqual([])
  })

  it("no asking price and no offer means the offer price is missing too", () => {
    const built = buildAnalysis({
      ...noLines,
      deal: { askingPricePence: null },
      stored: [],
    })
    if (!built.ok) throw new Error(built.message)
    expect(built.missingDetails).toEqual([
      "purchase.price",
      "refurb.budget",
      "exit.gdv",
    ])
    expect(built.analysis.verdict.reasons[0]).toBe(
      "Add your end value, refurb cost and offer price to see whether it stacks."
    )
  })
})
