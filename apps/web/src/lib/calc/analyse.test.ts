import fc from "fast-check"

import { analyseCore } from "./analyse"
import { BTL, CASH, CTX, INPUTS, RESI, RULES } from "./fixtures"
import { suggestGdv } from "./gdv"
import { analyseDeal } from "./index"
import { SCENARIOS } from "./sensitivity"
import type { DealInputs, Figure } from "./types"

/*
 * Worked BRR example (all £):
 *   Price 200,000 · additional property · SDLT = 6,250 + 7% × 75,000 = 11,500
 *   Buying costs: legal 1,800 + survey 600 = 2,400
 *   Bridge 70% LTV: gross 140,000; retained 1% × 12 = 16,800; 2% fee 2,800 deducted → net 120,400
 *   Deposit = 200,000 − 120,400 = 79,600 · lender cash fees: broker 1,000 + valuation 600 = 1,600
 *   Refurb 30,000 + 10% = 33,000 over 4 months · holding £290/month
 *
 * FLIP at month 8 (4 refurb + 4 selling):
 *   Cash invested = 79,600 + 11,500 + 2,400 + 1,600 + 33,000 + 8 × 290 (2,320) = 130,420
 *   Sale costs = 1.2% × 300,000 × 1.2 VAT (4,320) + 1,500 = 5,820
 *   Redemption = 140,000 + exit 1,400 − refund (16,800 − 11,200 = 5,600) = 135,800
 *   Profit = 300,000 − 5,820 − 135,800 − 130,420 = 27,960 · ROI = 21.44%
 *   Tax (income, £50,270 other income): 40% × 27,960 = 11,184 + NI 6% × 15,390 = 923.40
 *
 * KEEP: BTL needs 6 months owned → refinance at month 6 (2 months after refurb)
 *   Cash invested = 79,600 + 11,500 + 2,400 + 1,600 + 33,000 + 6 × 290 = 129,840
 *   Max loan: 75% × 300,000 = 225,000 (ICR cap 18,000 ÷ 6.875% = 261,818) → LTV binds
 *   3% fee added: net 225,000 ÷ 1.03 = 218,446.60, fee 6,553.40
 *   Redemption = 140,000 + 1,400 − (16,800 − 8,400) = 133,000
 *   Cash released = 218,446.60 − (valuation 500 + legal 1,000) − 133,000 = 83,946.60
 *   Money left in = 129,840 − 83,946.60 = 45,893.40
 *   Cashflow = 1,500 − IO 937.50 − (10+5+5)% × 1,500 − insurance 30 = 232.50
 *   ICR = 18,000 ÷ (225,000 × 5.5%) = 1.4545 (pass ≥ 1.25)
 */
describe("analyseDeal — worked example", () => {
  const a = analyseCore(INPUTS, CTX)

  it("purchase side", () => {
    expect(a.sdlt.totalPence).toBe(1_150_000)
    expect(a.acquisitionCosts.value).toBe(240_000)
    expect(a.purchaseFinance.netAdvancePence).toBe(12_040_000)
    expect(a.refurb.value).toBe(3_300_000)
  })

  it("flip", () => {
    expect(a.flip.months).toBe(8)
    expect(a.flip.cashInvestedPence).toBe(13_042_000)
    expect(a.flip.saleCostsPence).toBe(582_000)
    expect(a.flip.redemptionPence).toBe(13_580_000)
    expect(a.flip.profitPence).toBe(2_796_000)
    expect(a.flip.roi).toBeCloseTo(0.21438, 5)
    expect(a.flip.annualisedRoi).toBeCloseTo(0.21438 * 1.5, 4)
    expect(a.flip.taxPence).toBe(1_118_400 + 92_340)
  })

  it("flip tax modes", () => {
    const cgt = analyseCore(
      { ...INPUTS, flip: { ...INPUTS.flip, taxMode: "cgt" } },
      CTX
    )
    expect(cgt.flip.taxPence).toBe(599_040) // 24% × (27,960 − 3,000)
    const corp = analyseCore(
      { ...INPUTS, flip: { ...INPUTS.flip, taxMode: "corp_tax" } },
      CTX
    )
    expect(corp.flip.taxPence).toBe(531_240) // 19%
  })

  it("keep", () => {
    if (!a.keep.available) throw new Error("keep should be available")
    expect(a.keep.months).toBe(6)
    expect(a.keep.bindingConstraint).toBe("ltv")
    expect(a.keep.newLoanPence).toBe(21_844_660)
    expect(a.keep.totalLoanPence).toBe(22_500_000)
    expect(a.keep.cashReleasedPence).toBe(8_394_660)
    expect(a.keep.moneyLeftInPence).toBe(4_589_340)
    expect(a.keep.mortgagePaymentPence).toBe(93_750)
    expect(a.keep.monthlyCashflowPence).toBe(23_250)
    expect(a.keep.icr).toBeCloseTo(1.4545, 4)
    expect(a.keep.icrPass).toBe(true)
    expect(a.keep.grossYield).toBeCloseTo(0.06)
    expect(a.keep.roce).toBeCloseTo(279_000 / 4_589_340)
  })

  it("headline cash required is the larger exit's cash invested", () => {
    expect(a.cashRequired.value).toBe(13_042_000)
  })

  it("warns about the 6-month refinance wait", () => {
    expect(a.warnings.map((w) => w.code)).toContain("refinance_wait")
  })

  it("verdict: flip meets the buy box → stacks", () => {
    expect(a.verdict.level).toBe("stacks")
    expect(a.verdict.reasons).toContain("Flip meets your buy box")
  })
})

describe("keep edge cases", () => {
  it("low rent: target LTV fails the stress test and the loan is cut to the ICR max", () => {
    const a = analyseCore(
      { ...INPUTS, keep: { ...INPUTS.keep, rentMonthlyPence: 100_000 } },
      CTX
    )
    if (!a.keep.available) throw new Error()
    expect(a.keep.bindingConstraint).toBe("icr")
    expect(a.keep.totalLoanPence).toBe(17_454_545) // floor(12,000 ÷ 0.06875)
    expect(a.keep.icr).toBeCloseTo(12_000 / (225_000 * 0.055), 6) // 0.9697 at the target loan
    expect(a.keep.icrPass).toBe(false)
    expect(a.warnings.map((w) => w.code)).toContain("icr_fail")
  })

  it("cap by product LTV when the requested LTV is higher", () => {
    const a = analyseCore(
      { ...INPUTS, keep: { ...INPUTS.keep, refinanceLtv: 0.85 } },
      CTX
    )
    if (!a.keep.available) throw new Error()
    expect(a.keep.bindingConstraint).toBe("product_ltv")
  })

  it("money pulled out: negative money left in and infinite ROCE", () => {
    const a = analyseCore(
      {
        ...INPUTS,
        exit: { gdvPence: 40_000_000 },
        keep: { ...INPUTS.keep, rentMonthlyPence: 250_000 },
      },
      CTX
    )
    if (!a.keep.available) throw new Error()
    expect(a.keep.moneyLeftInPence).toBeLessThan(0)
    expect(a.keep.roce).toBe(Number.POSITIVE_INFINITY)
  })

  it("ICR fail counts against the keep exit in the verdict", () => {
    const a = analyseCore(
      { ...INPUTS, keep: { ...INPUTS.keep, rentMonthlyPence: 100_000 } },
      {
        ...CTX,
        buyBox: {
          ...CTX.buyBox,
          minFlipRoi: 0.9,
          maxMoneyLeftInPence: 100_000_000,
          minMonthlyCashflowPence: 0,
        },
      }
    )
    expect(a.verdict.criteria.find((c) => c.key === "keep.icr")?.pass).toBe(
      false
    )
    expect(a.verdict.level).toBe("doesnt_stack")
  })

  it("residential refinance without a stress test always passes ICR", () => {
    const a = analyseCore(INPUTS, {
      ...CTX,
      refiProduct: {
        ...BTL,
        type: "residential",
        stressRate: null,
        icrThreshold: null,
      },
    })
    if (!a.keep.available) throw new Error()
    expect(a.keep.icrPass).toBe(true)
  })

  it("no refinance product → keep unavailable with a reason, verdict judged on flip", () => {
    const a = analyseCore(INPUTS, { ...CTX, refiProduct: null })
    expect(a.keep.available).toBe(false)
    expect(a.verdict.level).toBe("stacks")
  })

  it("warns when residential purchase finance is combined with the keep exit", () => {
    const a = analyseCore(
      { ...INPUTS, purchaseFinance: { ltv: 0.75 } },
      { ...CTX, purchaseProduct: RESI }
    )
    expect(a.warnings.map((w) => w.code)).toContain("residential_keep")
  })

  it("residential purchase: ERC owed at sale reduces flip profit", () => {
    const withErc = analyseCore(INPUTS, { ...CTX, purchaseProduct: RESI })
    const without = analyseCore(INPUTS, {
      ...CTX,
      purchaseProduct: { ...RESI, ercBands: [] },
    })
    expect(withErc.flip.profitPence).toBeLessThan(without.flip.profitPence)
  })

  it("warns when the plan outlasts the bridge term", () => {
    const a = analyseCore(
      { ...INPUTS, refurb: { ...INPUTS.refurb, months: 10 } },
      CTX
    )
    expect(a.warnings.map((w) => w.code)).toContain("bridge_term")
  })
})

describe("flip edge cases", () => {
  it("loss-making flip has negative profit and no tax", () => {
    const a = analyseCore({ ...INPUTS, exit: { gdvPence: 21_000_000 } }, CTX)
    expect(a.flip.profitPence).toBeLessThan(0)
    expect(a.flip.taxPence).toBe(0)
  })
  it("agent VAT toggle", () => {
    const noVat = analyseCore(
      { ...INPUTS, flip: { ...INPUTS.flip, agentFeeVat: false } },
      CTX
    )
    expect(noVat.flip.saleCostsPence).toBe(360_000 + 150_000)
  })
  it("cash purchase: deposit is the full price", () => {
    const a = analyseCore(INPUTS, { ...CTX, purchaseProduct: CASH })
    expect(a.flip.cashInvestedPence).toBe(
      20_000_000 + 1_150_000 + 240_000 + 3_300_000 + 8 * 29_000
    )
  })
})

describe("affordability", () => {
  it("reports shortfall against free buying power", () => {
    const a = analyseCore(INPUTS, { ...CTX, freeBuyingPowerPence: 10_000_000 })
    expect(a.affordability).toEqual({
      affordable: false,
      shortfallPence: 3_042_000,
      freeBuyingPowerPence: 10_000_000,
    })
    expect(a.warnings.map((w) => w.code)).toContain("unaffordable")
  })
  it("is null when buying power isn't provided", () => {
    expect(analyseCore(INPUTS, CTX).affordability).toBeNull()
  })
})

describe("verdict", () => {
  it("marginal when the best exit is within tolerance", () => {
    // ROI 21.4% vs 23% min → 6.8% short (≤ 10%)
    const a = analyseCore(INPUTS, {
      ...CTX,
      buyBox: { ...CTX.buyBox, minFlipRoi: 0.23 },
    })
    expect(a.verdict.level).toBe("marginal")
  })
  it("doesn't stack when everything misses by more than the tolerance", () => {
    const a = analyseCore(INPUTS, {
      ...CTX,
      buyBox: { ...CTX.buyBox, minFlipRoi: 0.5, maxMoneyLeftInPence: 0 },
    })
    expect(a.verdict.level).toBe("doesnt_stack")
    expect(a.verdict.reasons.some((r) => r.startsWith("Misses"))).toBe(true)
  })
  it("keep alone can stack the deal", () => {
    const a = analyseCore(INPUTS, {
      ...CTX,
      buyBox: {
        ...CTX.buyBox,
        minFlipRoi: 0.9,
        maxMoneyLeftInPence: 5_000_000,
      },
    })
    expect(a.verdict.level).toBe("stacks")
    expect(a.verdict.reasons).toContain("Keep meets your buy box")
  })
})

describe("sensitivity", () => {
  const full = analyseDeal(INPUTS, CTX)
  const row = (key: string) => full.sensitivity.find((r) => r.key === key)

  it("has one row per scenario", () => {
    expect(full.sensitivity.map((r) => r.key)).toEqual(
      SCENARIOS.map((s) => s.key)
    )
  })
  it("GDV −10% reduces flip profit by 10% of GDV less the agent fee saving", () => {
    // ΔGDV −30,000; agent fee falls by 1.44% × 30,000 = 432 → Δprofit −29,568
    expect(row("gdv-10")?.flipProfitDeltaPence).toBe(-2_956_800)
  })
  it("refurb +10% costs 10% of items × (1 + contingency) on both exits", () => {
    expect(row("refurb+10")?.flipProfitDeltaPence).toBe(-330_000)
    expect(row("refurb+10")?.moneyLeftInDeltaPence).toBe(330_000)
  })
  it("deltas equal a direct recomputation", () => {
    const direct = analyseCore(
      {
        ...INPUTS,
        refurb: { ...INPUTS.refurb, months: INPUTS.refurb.months + 3 },
      },
      CTX
    )
    expect(row("time+3")?.flipProfitPence).toBe(direct.flip.profitPence)
  })
  it("rate +1% only hurts", () => {
    expect(row("rate+1")?.flipProfitDeltaPence).toBeLessThan(0)
    expect(row("rate+1")?.cashflowDeltaPence).toBeLessThan(0)
  })
})

describe("GDV suggestion", () => {
  const comps = [
    { soldPricePence: 28_000_000, floorAreaSqm: 80 },
    { soldPricePence: 30_000_000, floorAreaSqm: 85 },
    { soldPricePence: 32_000_000, floorAreaSqm: 90 },
    { soldPricePence: 35_000_000, floorAreaSqm: null },
  ]
  it("uses median £/sq ft × subject area with ≥ 3 sized comps", () => {
    const s = suggestGdv(comps, 85)
    expect(s.basis).toBe("price_per_sqft")
    expect(s.count).toBe(4)
    expect(s.medianPence).toBe(31_000_000)
    expect(s.minPence).toBe(28_000_000)
    expect(s.maxPence).toBe(35_000_000)
  })
  it("falls back to median price without a subject area", () => {
    expect(suggestGdv(comps, null)).toMatchObject({
      basis: "median_price",
      suggestedPence: 31_000_000,
    })
  })
  it("handles no comps", () => {
    expect(suggestGdv([], 80)).toMatchObject({
      basis: "none",
      suggestedPence: null,
    })
  })
})

/** Figures whose children are additive must sum to their value — the UI relies on this. */
const ADDITIVE = new Set([
  "flip.cashInvested",
  "keep.cashInvested",
  "flip.profit",
  "refurb",
  "sdlt",
  "acquisitionCosts",
  "deposit",
  "redemption",
  "flip.holding",
  "keep.holding",
  "flip.saleCosts",
  "keep.cashflow",
  "keep.cashReleased",
  "keep.moneyLeftIn",
])

function checkAdditive(figure: Figure, seen: string[] = []) {
  if (ADDITIVE.has(figure.key) && figure.children?.length) {
    const childSum = figure.children.reduce((t, c) => t + c.value, 0)
    expect({ key: figure.key, sum: childSum }).toEqual({
      key: figure.key,
      sum: figure.value,
    })
    seen.push(figure.key)
  }
  for (const child of figure.children ?? []) checkAdditive(child, seen)
  return seen
}

describe("breakdown invariants", () => {
  it("every additive figure's children sum to its value", () => {
    const a = analyseCore(INPUTS, CTX)
    if (!a.keep.available) throw new Error()
    const seen = [
      ...checkAdditive(a.flip.figures.profit),
      ...checkAdditive(a.keep.figures.moneyLeftIn),
      ...checkAdditive(a.keep.figures.cashflow),
    ]
    expect(new Set(seen).size).toBeGreaterThanOrEqual(10)
  })

  it("property: money outputs are integers, no NaN, breakdowns stay additive", () => {
    const pence = (max: number) => fc.integer({ min: 0, max })
    fc.assert(
      fc.property(
        pence(100_000_000).filter((p) => p >= 1_000_000),
        fc.double({ min: 0, max: 0.75, noNaN: true }),
        pence(10_000_000),
        fc.integer({ min: 0, max: 18 }),
        pence(1_000_000),
        fc.constantFrom<DealInputs["buyer"]["entity"]>("personal", "ltd"),
        (price, ltv, refurbCost, months, rent, entity) => {
          const inputs: DealInputs = {
            ...INPUTS,
            buyer: { ...INPUTS.buyer, entity },
            purchase: { ...INPUTS.purchase, pricePence: price },
            purchaseFinance: { ltv },
            refurb: {
              ...INPUTS.refurb,
              items: [
                {
                  id: "x",
                  category: "All",
                  description: "",
                  costPence: refurbCost,
                },
              ],
              months,
            },
            exit: { gdvPence: Math.round(price * 1.3) },
            keep: { ...INPUTS.keep, rentMonthlyPence: rent },
          }
          const a = analyseCore(inputs, CTX)
          for (const v of [
            a.sdlt.totalPence,
            a.flip.profitPence,
            a.flip.taxPence,
            a.cashRequired.value,
          ]) {
            expect(Number.isInteger(v)).toBe(true)
          }
          expect(Number.isNaN(a.flip.roi)).toBe(false)
          checkAdditive(a.flip.figures.profit)
          if (a.keep.available) {
            expect(Number.isInteger(a.keep.moneyLeftInPence)).toBe(true)
            expect(Number.isInteger(a.keep.monthlyCashflowPence)).toBe(true)
            checkAdditive(a.keep.figures.moneyLeftIn)
            if (a.keep.moneyLeftInPence > 0)
              expect(Number.isFinite(a.keep.roce)).toBe(true)
          }
        }
      ),
      { numRuns: 300 }
    )
  })

  it("is deterministic", () => {
    expect(analyseDeal(INPUTS, CTX)).toEqual(analyseDeal(INPUTS, CTX))
  })
})

it("rules fixture is the 2026/27 set", () => {
  expect(RULES.incomeTax.personalAllowancePence).toBe(1_257_000)
})
