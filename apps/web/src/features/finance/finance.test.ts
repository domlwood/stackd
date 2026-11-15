import { formatMoney } from "@/lib/format/money"
import { formatPercent } from "@/lib/format/percent"
import { productToRpcArgs, rowToProduct } from "./mappers"
import {
  affordability,
  computeBuyingPower,
  productStaleness,
  productTermsSummary,
} from "./rules"
import {
  emptyProduct,
  financeProductSchema,
  nextErcBand,
  normaliseForType,
  validateErcBands,
  type FinanceProductInput,
} from "./schemas"

const fmt = { money: (p: number) => formatMoney(p), percent: formatPercent }

const resi: FinanceProductInput = {
  ...emptyProduct("residential"),
  lender: "Nationwide",
  name: "2yr fix",
  rate: 0.0449,
  arrangementFeePence: 99_900,
  ercBands: [
    { fromMonth: 0, toMonth: 12, pct: 0.03 },
    { fromMonth: 12, toMonth: 24, pct: 0.02 },
  ],
}

describe("ERC schedule", () => {
  it("accepts contiguous bands", () => {
    expect(validateErcBands(resi.ercBands)).toEqual([])
  })
  it("flags gaps and overlaps against the previous band", () => {
    const problems = validateErcBands([
      { fromMonth: 0, toMonth: 12, pct: 0.03 },
      { fromMonth: 13, toMonth: 24, pct: 0.02 },
    ])
    expect(problems).toEqual([
      {
        index: 1,
        message: "Should start at month 12 (where the previous band ends)",
      },
    ])
  })
  it("flags empty ranges", () => {
    expect(
      validateErcBands([{ fromMonth: 6, toMonth: 6, pct: 0.01 }])[0]?.message
    ).toMatch(/after the start/)
  })
  it("suggests the next band continuing the schedule with a lower %", () => {
    expect(nextErcBand([])).toEqual({ fromMonth: 0, toMonth: 12, pct: 0.05 })
    expect(nextErcBand(resi.ercBands)).toEqual({
      fromMonth: 24,
      toMonth: 36,
      pct: 0.01,
    })
    expect(nextErcBand([{ fromMonth: 0, toMonth: 12, pct: 0.005 }]).pct).toBe(0)
  })
})

describe("financeProductSchema", () => {
  it("accepts a complete residential product", () => {
    expect(financeProductSchema.safeParse(resi).success).toBe(true)
  })
  it("requires the rate for mortgages", () => {
    const result = financeProductSchema.safeParse({ ...resi, rate: null })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((i) => i.path.join("."))).toContain("rate")
  })
  it("requires bridging terms", () => {
    const result = financeProductSchema.safeParse({
      ...emptyProduct("bridging"),
      lender: "MT Finance",
      name: "Light refurb",
    })
    expect(result.error?.issues.map((i) => i.path.join("."))).toContain(
      "monthlyRate"
    )
  })
  it("requires stress rate and ICR for BTL", () => {
    const btl = {
      ...emptyProduct("btl"),
      lender: "Kent Reliance",
      name: "5yr fix",
      rate: 0.0539,
      icrThreshold: null,
    }
    const paths = financeProductSchema
      .safeParse(btl)
      .error?.issues.map((i) => i.path.join("."))
    expect(paths).toEqual(
      expect.arrayContaining(["stressRate", "icrThreshold"])
    )
  })
  it("rejects ERCs on cash", () => {
    const cash = {
      ...emptyProduct("cash"),
      ercBands: [{ fromMonth: 0, toMonth: 12, pct: 0.01 }],
    }
    expect(financeProductSchema.safeParse(cash).success).toBe(false)
  })
  it("rejects rates expressed as percentages instead of fractions", () => {
    expect(
      financeProductSchema.safeParse({ ...resi, rate: 4.49 }).success
    ).toBe(false)
  })
})

describe("normaliseForType", () => {
  it("clears fields that don't apply after switching type", () => {
    const switched = normaliseForType({
      ...resi,
      type: "bridging",
      monthlyRate: 0.0085,
      exitFeePct: 0.01,
    })
    expect(switched.rate).toBeNull()
    expect(switched.repayment).toBeNull()
    expect(switched.monthlyRate).toBe(0.0085)
  })
  it("clears the unused arrangement fee representation", () => {
    const pct = normaliseForType({
      ...resi,
      arrangementFeeKind: "pct",
      arrangementFeePct: 0.02,
    })
    expect(pct.arrangementFeePence).toBe(0)
    expect(pct.arrangementFeePct).toBe(0.02)
  })
  it("drops the fixed period for trackers", () => {
    expect(
      normaliseForType({ ...resi, rateType: "tracker" }).fixedMonths
    ).toBeNull()
  })
})

describe("mappers", () => {
  it("round-trips a product through the RPC payload shape", () => {
    const { p_product, p_bands } = productToRpcArgs(resi, "ws")
    const row = {
      ...p_product,
      id: "11111111-1111-1111-1111-111111111111",
      created_at: "",
      created_by: null,
      updated_at: "2026-11-01T00:00:00Z",
      last_reviewed_at: "2026-11-01T00:00:00Z",
      archived_at: null,
    }
    const back = rowToProduct(
      row,
      p_bands.map((b, ordinal) => ({ ...b, ordinal }))
    )
    expect(back.rate).toBe(0.0449)
    expect(back.ercBands).toEqual(resi.ercBands)
    expect(back.arrangementFeePence).toBe(99_900)
  })
  it("sorts bands by ordinal", () => {
    const { p_product } = productToRpcArgs(resi, "ws")
    const row = {
      ...p_product,
      id: "x",
      created_at: "",
      created_by: null,
      updated_at: "",
      last_reviewed_at: "",
      archived_at: null,
    }
    const product = rowToProduct(row, [
      { ordinal: 1, from_month: 12, to_month: 24, pct: 0.02 },
      { ordinal: 0, from_month: 0, to_month: 12, pct: 0.03 },
    ])
    expect(product.ercBands[0]?.fromMonth).toBe(0)
  })
})

describe("productStaleness", () => {
  const now = new Date("2026-11-15T12:00:00Z")
  it("is fresh within the window and stale after it", () => {
    expect(productStaleness("2026-08-17T12:00:00Z", 90, now)).toEqual({
      stale: false,
      daysSinceReview: 90,
    })
    expect(productStaleness("2026-08-16T12:00:00Z", 90, now)).toEqual({
      stale: true,
      daysSinceReview: 91,
    })
  })
  it("never reports negative ages for future timestamps", () => {
    expect(
      productStaleness("2026-12-01T00:00:00Z", 90, now).daysSinceReview
    ).toBe(0)
  })
})

describe("buying power", () => {
  const pots = [
    { ownerUserId: "a", amountPence: 5_000_000 },
    { ownerUserId: "b", amountPence: 3_000_000 },
    { ownerUserId: "a", amountPence: 2_000_000 },
  ]
  it("sums pots, subtracts commitments and groups by owner", () => {
    const power = computeBuyingPower(pots, [
      { dealId: "d1", label: "1 High St", cashRequiredPence: 4_500_000 },
    ])
    expect(power.totalPotsPence).toBe(10_000_000)
    expect(power.committedPence).toBe(4_500_000)
    expect(power.freePence).toBe(5_500_000)
    expect(power.byOwner).toEqual([
      { ownerUserId: "a", totalPence: 7_000_000 },
      { ownerUserId: "b", totalPence: 3_000_000 },
    ])
  })
  it("can be over-committed", () => {
    expect(
      computeBuyingPower(pots, [
        { dealId: "d", label: "x", cashRequiredPence: 12_000_000 },
      ]).freePence
    ).toBe(-2_000_000)
  })
  it("reports affordability and shortfall", () => {
    expect(affordability(5_000_000, 4_000_000)).toEqual({
      affordable: true,
      shortfallPence: 0,
    })
    expect(affordability(5_000_000, 6_250_000)).toEqual({
      affordable: false,
      shortfallPence: 1_250_000,
    })
  })
})

describe("productTermsSummary", () => {
  it("summarises a residential product", () => {
    expect(productTermsSummary(resi, fmt)).toBe(
      "4.49% fixed 24m · 75% LTV · £999 fee"
    )
  })
  it("summarises bridging and cash", () => {
    const bridge = {
      ...emptyProduct("bridging"),
      monthlyRate: 0.0085,
      arrangementFeeKind: "pct" as const,
      arrangementFeePct: 0.02,
    }
    expect(productTermsSummary(bridge, fmt)).toBe(
      "0.85%/month retained · 75% LTV · 2% fee"
    )
    expect(productTermsSummary(emptyProduct("cash"), fmt)).toBe("No borrowing")
  })
})
