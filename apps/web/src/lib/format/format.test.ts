import { daysBetween, formatDate, formatRelative } from "./date"
import { formatMoney, formatMoneyDelta, parseMoneyInput } from "./money"
import { formatPercent, parsePercentInput } from "./percent"

describe("formatMoney", () => {
  it("formats headline GBP without pennies", () => {
    expect(formatMoney(24_500_000)).toBe("£245,000")
    expect(formatMoney(12_350)).toBe("£124")
  })
  it("rounds half away from zero for negatives", () => {
    expect(formatMoney(-12_350)).toBe("-£124")
  })
  it("shows pennies in exact mode", () => {
    expect(formatMoney(123_456, "exact")).toBe("£1,234.56")
  })
  it("compacts large values", () => {
    expect(formatMoney(120_000_000, "compact")).toBe("£1.2m")
    expect(formatMoney(24_500_000, "compact")).toBe("£245k")
  })
  it("renders non-finite values as a dash", () => {
    expect(formatMoney(Number.NaN)).toBe("—")
  })
})

describe("formatMoneyDelta", () => {
  it("signs deltas with a true minus", () => {
    expect(formatMoneyDelta(120_000)).toBe("+£1,200")
    expect(formatMoneyDelta(-80_000)).toBe("−£800")
    expect(formatMoneyDelta(0)).toBe("£0")
  })
})

describe("parseMoneyInput", () => {
  it.each([
    ["£245,000", 24_500_000],
    ["245k", 24_500_000],
    ["1.2m", 120_000_000],
    ["99.50", 9_950],
    ["  1 000 ", 100_000],
  ])("%s → %i pence", (raw, expected) => {
    expect(parseMoneyInput(raw)).toBe(expected)
  })
  it("rejects junk", () => {
    expect(parseMoneyInput("abc")).toBeNull()
    expect(parseMoneyInput("")).toBeNull()
  })
})

describe("percent", () => {
  it("formats fractions as percentages", () => {
    expect(formatPercent(0.055)).toBe("5.5%")
    expect(formatPercent(1.25, 0)).toBe("125%")
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe("∞")
  })
  it("parses user input into fractions", () => {
    expect(parsePercentInput("5.5%")).toBeCloseTo(0.055)
    expect(parsePercentInput("x")).toBeNull()
  })
})

describe("dates", () => {
  it("formats in en-GB / London time", () => {
    expect(formatDate("2026-11-15T23:30:00Z")).toBe("15 Nov 2026")
    expect(formatDate("2026-07-15T23:30:00Z")).toBe("16 Jul 2026")
  })
  it("formats relative times", () => {
    const now = new Date("2026-11-15T12:00:00Z")
    expect(formatRelative("2026-11-15T11:59:30Z", now)).toBe("just now")
    expect(formatRelative("2026-11-15T10:00:00Z", now)).toBe("2 hours ago")
    expect(formatRelative("2026-11-14T12:00:00Z", now)).toBe("yesterday")
  })
  it("counts whole days", () => {
    expect(daysBetween("2026-01-01T00:00:00Z", "2026-03-01T00:00:00Z")).toBe(59)
  })
})
