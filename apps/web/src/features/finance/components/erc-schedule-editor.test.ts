import { describeBand } from "./erc-schedule-editor"

describe("describeBand", () => {
  it.each([
    [{ fromMonth: 0, toMonth: 12, pct: 0.03 }, "Year 1: 3%"],
    [{ fromMonth: 12, toMonth: 36, pct: 0.025 }, "Years 2–3: 2.5%"],
    [{ fromMonth: 0, toMonth: 6, pct: 0.01 }, "Months 1–6: 1%"],
  ])("%o → %s", (band, expected) => {
    expect(describeBand(band)).toBe(expected)
  })
})
