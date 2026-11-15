import fc from "fast-check"

import { RULES } from "./fixtures"
import { holdingCosts } from "./holding"
import { quickRefurbEstimate, refurbTotal, splitEstimate } from "./refurb"
import {
  capitalGainsTax,
  class4Ni,
  corporationTax,
  flipTax,
  incomeTax,
  personalAllowance,
} from "./tax"

describe("refurb", () => {
  it("adds contingency to line items", () => {
    const r = refurbTotal({
      items: [
        { id: "a", category: "Kitchen", description: "", costPence: 1_000_000 },
        { id: "b", category: "Bath", description: "", costPence: 500_000 },
      ],
      contingency: 0.1,
      months: 3,
    })
    expect(r.totalPence).toBe(1_650_000)
  })
  it("quick estimate: m² → sq ft × rate", () => {
    // 80 m² = 861.112 sq ft × £40 = £34,444.48
    expect(quickRefurbEstimate(80, 4_000)).toBe(3_444_448)
  })
  it("split estimate sums exactly to the total in whole pence", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50_000_000 }),
        fc.array(fc.double({ min: 0.01, max: 1, noNaN: true }), {
          minLength: 1,
          maxLength: 8,
        }),
        (total, weights) => {
          const parts = splitEstimate(
            total,
            weights.map((w, i) => ({ category: `c${i}`, weight: w }))
          )
          expect(parts.reduce((t, p) => t + p.costPence, 0)).toBe(total)
          expect(
            parts.every(
              (p) => Number.isInteger(p.costPence) && p.costPence >= 0
            )
          ).toBe(true)
        }
      )
    )
  })
})

describe("holding", () => {
  it("counts serviced finance but not zero lines", () => {
    const h = holdingCosts(
      {
        councilTaxMonthlyPence: 15_000,
        utilitiesMonthlyPence: 10_000,
        insuranceMonthlyPence: 4_000,
        otherMonthlyPence: 0,
      },
      140_000,
      6,
      "x"
    )
    expect(h.totalPence).toBe(6 * 169_000)
    expect(h.figure.children).toHaveLength(4)
  })
})

describe("tax", () => {
  const it2026 = RULES.incomeTax
  it("personal allowance tapers £1 per £2 over £100k", () => {
    expect(personalAllowance(10_000_000, it2026)).toBe(1_257_000)
    expect(personalAllowance(11_000_000, it2026)).toBe(757_000)
    expect(personalAllowance(12_514_000, it2026)).toBe(0)
  })
  it("income tax across bands", () => {
    expect(incomeTax(1_257_000, it2026)).toBe(0)
    expect(incomeTax(5_027_000, it2026)).toBe(754_000) // 20% × £37,700
    expect(incomeTax(10_000_000, it2026)).toBe(2_743_200) // £7,540 + 40% × £49,730
    // £150k: no allowance; 20% × 37,700 + 40% × (125,140 − 37,700) + 45% × 24,860
    expect(incomeTax(15_000_000, it2026)).toBe(754_000 + 3_497_600 + 1_118_700)
  })
  it("class 4 NI: 6% main band, 2% above", () => {
    expect(class4Ni(1_257_000, it2026.class4Ni)).toBe(0)
    expect(class4Ni(6_027_000, it2026.class4Ni)).toBe(226_200 + 20_000)
  })
  it("corporation tax with marginal relief", () => {
    expect(corporationTax(5_000_000, RULES.corpTax)).toBe(950_000)
    expect(corporationTax(25_000_000, RULES.corpTax)).toBe(6_250_000)
    // £100k: 25% × 100k − 3/200 × 150k = £22,750
    expect(corporationTax(10_000_000, RULES.corpTax)).toBe(2_275_000)
    expect(corporationTax(-100, RULES.corpTax)).toBe(0)
  })
  it("CGT uses remaining basic band at 18%, then 24%, after £3,000 exempt", () => {
    // other income £30k → taxable £17,430 → basic space £20,270
    // gain £30k → taxable £27k: 20,270 × 18% + 6,730 × 24%
    expect(capitalGainsTax(3_000_000, 3_000_000, RULES.cgt, it2026)).toBe(
      364_860 + 161_520
    )
  })
  it("no tax on a loss", () => {
    expect(flipTax(-500_000, "income_tax", 5_027_000, RULES).taxPence).toBe(0)
  })
})
