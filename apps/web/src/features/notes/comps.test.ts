import { summariseComps } from "./comps"
import { dealNoteInputSchema } from "./schemas"
import type { Comparable, DealNote } from "./types"

const note = (comp: Partial<Comparable> | null, i = 0): DealNote => ({
  id: String(i),
  dealId: "d",
  kind: comp ? "comparable" : "note",
  body: comp ? null : "hello",
  linkUrl: null,
  comp: comp
    ? {
        address: `${i} Test St`,
        pricePence: 20_000_000,
        status: "sold",
        date: null,
        beds: null,
        floorAreaSqm: null,
        ...comp,
      }
    : null,
  pinned: false,
  authorId: null,
  createdAt: "2026-11-17T00:00:00Z",
  updatedAt: "2026-11-17T00:00:00Z",
})

describe("summariseComps", () => {
  it("is empty with no comparables", () => {
    expect(summariseComps([note(null)], 80)).toBeNull()
  })

  it("uses sold prices, ignoring asking prices when anything has sold", () => {
    const s = summariseComps(
      [
        note({ pricePence: 20_000_000 }, 1),
        note({ pricePence: 24_000_000 }, 2),
        note({ pricePence: 50_000_000, status: "listed" }, 3),
      ],
      null
    )
    expect(s).toMatchObject({
      basis: "sold",
      count: 2,
      medianPricePence: 22_000_000,
      lowPricePence: 20_000_000,
      highPricePence: 24_000_000,
    })
  })

  it("falls back to asking prices when nothing has sold", () => {
    expect(
      summariseComps([note({ status: "listed", pricePence: 30_000_000 })], null)
    ).toMatchObject({ basis: "listed", count: 1, medianPricePence: 30_000_000 })
  })

  it("works out £/sq ft and what it implies for this property", () => {
    // £215,278 over 100 sqm (1,076 sq ft) = £200/sq ft
    const s = summariseComps(
      [note({ pricePence: 21_527_800, floorAreaSqm: 100 })],
      80
    )
    expect(s?.medianPerSqftPence).toBe(20_000)
    // £200 × 861 sq ft ≈ £172,000 (rounded to £1,000)
    expect(s?.impliedValuePence).toBe(17_200_000)
  })
})

describe("dealNoteInputSchema", () => {
  it("needs words in a note", () => {
    expect(
      dealNoteInputSchema.safeParse({ kind: "note", body: "  " }).success
    ).toBe(false)
  })
  it("needs an address, price and status for a comparable", () => {
    expect(
      dealNoteInputSchema.safeParse({
        kind: "comparable",
        address: "1 A St",
        status: "sold",
      }).success
    ).toBe(false)
    expect(
      dealNoteInputSchema.parse({
        kind: "comparable",
        address: "1 A St",
        pricePence: 20_000_000,
        status: "sold",
        linkUrl: "",
      })
    ).toMatchObject({ linkUrl: null, date: null, beds: null, body: null })
  })
  it("only accepts web links", () => {
    expect(
      dealNoteInputSchema.safeParse({
        kind: "note",
        body: "x",
        linkUrl: "javascript:alert(1)",
      }).success
    ).toBe(false)
  })
})
