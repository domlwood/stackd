import { analyseCore } from "@/lib/calc/analyse"
import { CTX } from "@/lib/calc/fixtures"
import type { Figure } from "@/lib/calc/types"
import {
  inputDef,
  INPUT_DEFS,
  refurbItemCostKey,
  type DefaultsSource,
} from "./registry"
import { resolveInputs, type StoredInput } from "./resolve"
import { toDealInputs } from "./to-deal-inputs"

export const DEFAULTS: DefaultsSource = {
  buyerEntity: "personal",
  today: "2026-11-15",
  deal: { askingPricePence: 20_000_000, suggestedGdvPence: 30_000_000 },
  defaults: {
    buyer: {
      additionalProperty: true,
      nonResident: false,
      corporateRelief: true,
    },
    purchase: {
      legalPence: 180_000,
      surveyPence: 60_000,
      sourcingPence: 0,
      otherPence: 0,
      monthsToComplete: 3,
    },
    finance: { purchaseLtv: 0.7 },
    refurb: { contingency: 0.1, months: 4 },
    holding: {
      councilTaxMonthlyPence: 15_000,
      utilitiesMonthlyPence: 10_000,
      insuranceMonthlyPence: 4_000,
      otherMonthlyPence: 0,
    },
    flip: {
      agentFee: 0.012,
      agentFeeVat: true,
      saleLegalPence: 150_000,
      monthsToSell: 4,
      otherIncomePence: 5_027_000,
    },
    keep: {
      refinanceLtv: 0.75,
      management: 0.1,
      voids: 0.05,
      maintenance: 0.05,
      insuranceMonthlyPence: 3_000,
      groundRentServiceMonthlyPence: 0,
      otherMonthlyPence: 0,
      refinanceLegalPence: 100_000,
    },
  },
}

const ALEX = "00000000-0000-0000-0000-00000000000a"
const BLAIR = "00000000-0000-0000-0000-00000000000b"
const ITEM = "11111111-1111-1111-1111-111111111111"

const stored = (
  key: string,
  value: unknown,
  userId: string | null = null
): StoredInput => ({
  key,
  value,
  scope: userId ? "proposal" : "agreed",
  userId,
  setBy: userId ?? ALEX,
  setAt: "2026-11-15T10:00:00Z",
})

describe("resolveInputs", () => {
  const rows: StoredInput[] = [
    stored("purchase.price", 19_500_000),
    stored("exit.gdv", 31_000_000),
    stored("exit.gdv", 29_000_000, BLAIR),
    stored("keep.rentMonthly", 150_000, BLAIR),
    stored("purchase.price", 19_500_000, ALEX), // same as agreed → not a diff
    stored(refurbItemCostKey(ITEM), 3_000_000),
  ]

  it("defaults ← agreed in the Agreed view", () => {
    const r = resolveInputs({
      stored: rows,
      defaults: DEFAULTS,
      view: { kind: "agreed" },
      refurbItemIds: [ITEM],
    })
    expect(r.values["purchase.price"]).toBe(19_500_000)
    expect(r.provenance["purchase.price"]?.origin).toBe("agreed")
    expect(r.values["purchase.legal"]).toBe(180_000)
    expect(r.provenance["purchase.legal"]?.origin).toBe("default")
    expect(r.values["exit.gdv"]).toBe(31_000_000)
    expect(r.diffKeys).toEqual([])
  })

  it("a user's view layers their proposals and marks diffs from Agreed", () => {
    const r = resolveInputs({
      stored: rows,
      defaults: DEFAULTS,
      view: { kind: "user", userId: BLAIR },
      refurbItemIds: [ITEM],
    })
    expect(r.values["exit.gdv"]).toBe(29_000_000)
    expect(r.provenance["exit.gdv"]).toMatchObject({
      origin: "proposal",
      agreedValue: 31_000_000,
      differsFromAgreed: true,
    })
    expect(r.provenance["keep.rentMonthly"]).toMatchObject({
      origin: "proposal",
      agreedValue: 0,
      differsFromAgreed: true,
    })
    expect(r.diffKeys.sort()).toEqual(["exit.gdv", "keep.rentMonthly"])
  })

  it("ignores other users' proposals", () => {
    const r = resolveInputs({
      stored: rows,
      defaults: DEFAULTS,
      view: { kind: "user", userId: ALEX },
      refurbItemIds: [ITEM],
    })
    expect(r.values["exit.gdv"]).toBe(31_000_000)
    expect(r.diffKeys).toEqual([]) // Alex's price proposal equals Agreed
  })

  it("rejects unknown keys and invalid values without failing", () => {
    const r = resolveInputs({
      stored: [
        stored("purchase.bogus", 1),
        stored("purchase.price", -5),
        stored("keep.voids", 1.5),
      ],
      defaults: DEFAULTS,
      view: { kind: "agreed" },
      refurbItemIds: [],
    })
    expect(r.issues.map((i) => i.reason)).toEqual([
      "Unknown input",
      "Stored value is invalid",
      "Stored value is invalid",
    ])
    expect(r.values["purchase.price"]).toBe(20_000_000)
  })

  it("ignores values for refurb lines that were deleted", () => {
    const r = resolveInputs({
      stored: [stored(refurbItemCostKey(ITEM), 500_000, BLAIR)],
      defaults: DEFAULTS,
      view: { kind: "user", userId: BLAIR },
      refurbItemIds: [],
    })
    expect(r.issues).toEqual([
      { key: refurbItemCostKey(ITEM), reason: "Refurb line no longer exists" },
    ])
  })

  it("derives defaults: completion date, tax mode by entity, GDV from suggestion", () => {
    const r = resolveInputs({
      stored: [],
      defaults: { ...DEFAULTS, buyerEntity: "ltd" },
      view: { kind: "agreed" },
      refurbItemIds: [],
    })
    expect(r.values["purchase.completionDate"]).toBe("2027-02-15")
    expect(r.values["flip.taxMode"]).toBe("corp_tax")
    expect(r.values["exit.gdv"]).toBe(30_000_000)
  })
})

describe("toDealInputs", () => {
  it("produces engine inputs that analyse cleanly", () => {
    const resolved = resolveInputs({
      stored: [
        stored(refurbItemCostKey(ITEM), 3_000_000),
        stored("keep.rentMonthly", 150_000),
        stored(
          "purchaseFinance.product",
          "22222222-2222-4222-8222-222222222222"
        ),
      ],
      defaults: DEFAULTS,
      view: { kind: "agreed" },
      refurbItemIds: [ITEM],
    })
    const { inputs, purchaseProductId, refiProductId } = toDealInputs(
      resolved,
      [{ id: ITEM, category: "Kitchen", description: "" }]
    )
    expect(purchaseProductId).toBe("22222222-2222-4222-8222-222222222222")
    expect(refiProductId).toBeNull()
    expect(inputs.refurb.items[0]?.costPence).toBe(3_000_000)
    // Same numbers as the calc worked example → same profit.
    expect(analyseCore(inputs, CTX).flip.profitPence).toBe(2_796_000)
  })
})

describe("registry", () => {
  it("has unique keys and valid defaults", () => {
    expect(new Set(INPUT_DEFS.map((d) => d.key)).size).toBe(INPUT_DEFS.length)
    for (const d of INPUT_DEFS)
      expect(d.schema.safeParse(d.defaultValue(DEFAULTS)).success).toBe(true)
  })

  it("every input key referenced by an analysis figure exists", () => {
    const keys = new Set<string>()
    const walk = (f: Figure) => {
      f.inputs?.forEach((k) => keys.add(k))
      f.children?.forEach(walk)
    }
    const a = analyseCore(
      toDealInputs(
        resolveInputs({
          stored: [],
          defaults: DEFAULTS,
          view: { kind: "agreed" },
          refurbItemIds: [ITEM],
        }),
        [{ id: ITEM, category: "x", description: "" }]
      ).inputs,
      CTX
    )
    ;[
      a.sdlt.figure,
      a.cashRequired,
      a.flip.figures.profit,
      a.flip.figures.tax,
    ].forEach(walk)
    if (a.keep.available) Object.values(a.keep.figures).forEach(walk)
    a.warnings.forEach((w) => w.inputs?.forEach((k) => keys.add(k)))
    const missing = [...keys].filter((k) => !inputDef(k))
    expect(missing).toEqual([])
  })
})
