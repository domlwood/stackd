import { decodeRightmoveModel } from "./rightmove-model"

const encoded = (table: unknown[]) => ({
  encoding: "on",
  data: JSON.stringify(table),
})

describe("decodeRightmoveModel", () => {
  it("preserves literal numbers, booleans, nulls and repeated references", () => {
    expect(
      decodeRightmoveModel(
        encoded([
          { beds: 1, baths: 1, price: 2, enabled: 3, empty: 4, images: 5 },
          2,
          140000,
          false,
          null,
          [6, 6],
          "photo",
        ])
      )
    ).toEqual({
      beds: 2,
      baths: 2,
      price: 140000,
      enabled: false,
      empty: null,
      images: ["photo", "photo"],
    })
  })

  it("leaves legacy models alone", () => {
    const model = { propertyData: { bedrooms: 2 } }
    expect(decodeRightmoveModel(model)).toBe(model)
  })

  it.each([
    encoded([]),
    encoded([{ value: 9 }]),
    encoded([{ value: -1 }]),
    encoded([{ value: 0.5 }]),
    encoded([{ value: "1" }]),
    encoded([{ value: 0 }]),
    { encoding: "on", data: "{}" },
    { encoding: "on", data: "broken" },
    { encoding: "on" },
  ])("rejects malformed or cyclic tables without throwing: %j", (model) => {
    expect(decodeRightmoveModel(model)).toBeUndefined()
  })

  it("bounds nesting depth on untrusted page data", () => {
    const table = Array.from({ length: 150 }, (_, i) => ({ next: i + 1 }))
    expect(decodeRightmoveModel(encoded([...table, null]))).toBeUndefined()
  })
})
