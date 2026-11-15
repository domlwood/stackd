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
    if (!built.ok)
      expect(built.message).toMatch(/Add tax rules for that date in Settings/)
    expect(summarise(built)).toMatchObject({
      verdict: null,
      error: expect.any(String),
    })
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
