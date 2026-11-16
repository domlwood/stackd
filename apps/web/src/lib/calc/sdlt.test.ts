import { RULES } from "./fixtures"
import { selectRuleSet } from "./rules/schema"
import { ENGLAND_RULES } from "./rules/england-2026"
import { calculateSdlt } from "./sdlt"
import type { DealInputs } from "./types"

const personal: DealInputs["buyer"] = {
  entity: "personal",
  additionalProperty: false,
  nonResident: false,
  firstTimeBuyer: false,
  corporateRelief: false,
}
const ftb = { ...personal, firstTimeBuyer: true }
const additional = { ...personal, additionalProperty: true }
const ltd = { ...personal, entity: "ltd" as const }
const sdlt = (buyer: DealInputs["buyer"], pounds: number) =>
  calculateSdlt(buyer, pounds * 100, RULES.sdlt)

describe("SDLT", () => {
  it("matches the gov.uk worked example: £295,000 standard = £4,750", () => {
    // 0% on £125k + 2% on £125k (£2,500) + 5% on £45k (£2,250)
    expect(sdlt(personal, 295_000).totalPence).toBe(475_000)
  })

  it.each([
    [125_000, 0],
    [125_001, 2], // 2% of £1 = 2p
    [250_000, 250_000],
    [925_000, 3_625_000], // £2,500 + 5% × £675k = £36,250
    [1_500_000, 9_375_000], // + 10% × £575k = £93,750
    [2_000_000, 15_375_000], // + 12% × £500k = £153,750
  ])("standard rates at band edge £%i → %i pence", (pounds, pence) => {
    expect(sdlt(personal, pounds).totalPence).toBe(pence)
  })

  it("adds the 5% higher-rates surcharge on every band for an additional property", () => {
    // £4,750 + 5% × £295,000
    expect(sdlt(additional, 295_000).totalPence).toBe(1_950_000)
    expect(sdlt(additional, 295_000).basis).toBe("higher_rates")
  })

  it("doesn't apply the surcharge below £40,000", () => {
    expect(sdlt(additional, 39_999).totalPence).toBe(0)
    expect(sdlt(additional, 40_000).totalPence).toBe(200_000)
  })

  it("adds the 2% non-resident surcharge", () => {
    expect(sdlt({ ...personal, nonResident: true }, 295_000).totalPence).toBe(
      475_000 + 590_000
    )
  })

  it("companies always pay higher rates", () => {
    expect(sdlt(ltd, 500_000).totalPence).toBe(4_000_000) // 6,250 + 8,750 + 25,000
  })

  it("companies over £500k pay a 17% flat rate unless relieved", () => {
    expect(sdlt(ltd, 500_001).totalPence).toBe(8_500_017)
    expect(sdlt(ltd, 500_001).basis).toBe("corporate_flat")
    expect(sdlt({ ...ltd, corporateRelief: true }, 500_001).basis).toBe(
      "higher_rates"
    )
  })

  it("shows its working: non-zero bands sum to the total", () => {
    const result = sdlt(additional, 400_000)
    expect(result.figure.children?.reduce((t, c) => t + c.value, 0)).toBe(
      result.totalPence
    )
  })
})

describe("SDLT first-time buyer relief", () => {
  it("nothing to pay up to £300,000", () => {
    expect(sdlt(ftb, 300_000).totalPence).toBe(0)
    expect(sdlt(ftb, 300_000).basis).toBe("first_time_buyer")
  })
  it("5% on the part from £300,001 to £500,000 (gov.uk)", () => {
    expect(sdlt(ftb, 400_000).totalPence).toBe(500_000)
    expect(sdlt(ftb, 500_000).totalPence).toBe(1_000_000)
  })
  it("no relief over £500,000: standard rates apply", () => {
    expect(sdlt(ftb, 500_001).basis).toBe("standard")
    expect(sdlt(ftb, 500_001).totalPence).toBe(
      sdlt(personal, 500_001).totalPence
    )
  })
  it("doesn't apply to an additional property or a company", () => {
    expect(sdlt({ ...ftb, additionalProperty: true }, 200_000).basis).toBe(
      "higher_rates"
    )
    expect(sdlt({ ...ftb, entity: "ltd" }, 200_000).basis).toBe("higher_rates")
  })
  it("non-resident surcharge still applies on top", () => {
    expect(sdlt({ ...ftb, nonResident: true }, 200_000).totalPence).toBe(
      400_000
    )
  })
})

describe("tax rule selection", () => {
  it("selects the rule set in force on a date", () => {
    expect(
      selectRuleSet(ENGLAND_RULES, "income_tax", "2026-06-01")
        .personalAllowancePence
    ).toBe(1_257_000)
  })
  it("throws a clear error when no rules cover the date", () => {
    expect(() =>
      selectRuleSet(ENGLAND_RULES, "income_tax", "2030-01-01")
    ).toThrow(/No income_tax rules in force on 2030-01-01/)
  })
  it("prefers the latest effective rule set", () => {
    const records = [
      {
        kind: "vat" as const,
        effectiveFrom: "2000-01-01",
        effectiveTo: null,
        data: { standardRate: 0.175 },
        sourceUrl: null,
        verifiedAt: null,
      },
      {
        kind: "vat" as const,
        effectiveFrom: "2011-01-04",
        effectiveTo: null,
        data: { standardRate: 0.2 },
        sourceUrl: null,
        verifiedAt: null,
      },
    ]
    expect(selectRuleSet(records, "vat", "2026-01-01").standardRate).toBe(0.2)
    expect(selectRuleSet(records, "vat", "2005-01-01").standardRate).toBe(0.175)
  })
  it("a workspace edit wins over the global row on the same date", () => {
    const records = [
      {
        kind: "vat" as const,
        effectiveFrom: "2011-01-04",
        effectiveTo: null,
        data: { standardRate: 0.2 },
        sourceUrl: null,
        verifiedAt: null,
        workspaceScoped: true,
      },
      {
        kind: "vat" as const,
        effectiveFrom: "2011-01-04",
        effectiveTo: null,
        data: { standardRate: 0.25 },
        sourceUrl: null,
        verifiedAt: null,
      },
    ]
    expect(selectRuleSet(records, "vat", "2026-01-01").standardRate).toBe(0.2)
    expect(
      selectRuleSet([...records].reverse(), "vat", "2026-01-01").standardRate
    ).toBe(0.2)
  })
  it("rejects malformed rule data", () => {
    const bad = [
      {
        kind: "vat" as const,
        effectiveFrom: "2011-01-04",
        effectiveTo: null,
        data: { standardRate: 20 },
        sourceUrl: null,
        verifiedAt: null,
      },
    ]
    expect(() => selectRuleSet(bad, "vat", "2026-01-01")).toThrow()
  })
})
