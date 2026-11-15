import { DEFAULT_SETTINGS, settingsSchema } from "./schemas"

describe("settingsSchema", () => {
  it("fills every default from an empty object", () => {
    expect(DEFAULT_SETTINGS.buyBox.minFlipRoi).toBe(0.2)
    expect(DEFAULT_SETTINGS.defaults.comps.radiusMetres).toBe(1_000)
    expect(DEFAULT_SETTINGS.buyerEntity).toBe("personal")
  })

  it("keeps partial overrides and defaults the rest", () => {
    const parsed = settingsSchema.parse({ defaults: { keep: { voids: 0.08 } } })
    expect(parsed.defaults.keep.voids).toBe(0.08)
    expect(parsed.defaults.keep.management).toBe(0.1)
  })

  it("rejects fractional pence", () => {
    expect(() =>
      settingsSchema.parse({ buyBox: { minFlipProfitPence: 10.5 } })
    ).toThrow()
  })
})
