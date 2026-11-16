import type { Provenance } from "@/lib/inputs/resolve"
import { provenanceTag } from "./provenance"

const p = (origin: Provenance["origin"], extra: Partial<Provenance> = {}) =>
  ({ origin, differsFromAgreed: false, stored: null, ...extra }) as Provenance
const facts = { askingPricePence: 12_000_000, refurbLineCount: 0 }

describe("provenanceTag", () => {
  it("labels stored values by who set them", () => {
    expect(provenanceTag("exit.gdv", p("agreed"), {}, facts)).toBe("yours")
    expect(provenanceTag("exit.gdv", p("proposal"), {}, facts)).toBe("proposed")
  })

  it("offer price defaults to the imported asking price, or is missing", () => {
    expect(provenanceTag("purchase.price", p("default"), {}, facts)).toBe(
      "imported"
    )
    expect(
      provenanceTag(
        "purchase.price",
        p("default"),
        {},
        {
          ...facts,
          askingPricePence: null,
        }
      )
    ).toBe("missing")
  })

  it("end value and an empty refurb budget are missing until you set them", () => {
    expect(provenanceTag("exit.gdv", p("default"), {}, facts)).toBe("missing")
    expect(
      provenanceTag(
        "refurb.budget",
        p("default"),
        { "refurb.budget": 0 },
        facts
      )
    ).toBe("missing")
    expect(
      provenanceTag(
        "refurb.budget",
        p("default"),
        { "refurb.budget": 0 },
        {
          ...facts,
          refurbLineCount: 2,
        }
      )
    ).toBe("preset")
  })

  it("only modelled estimates are 'estimated'; rule-based defaults are presets", () => {
    const derived = p("default", { derived: true })
    expect(provenanceTag("keep.rentMonthly", derived, {}, facts)).toBe(
      "estimated"
    )
    expect(provenanceTag("flip.taxMode", derived, {}, facts)).toBe("preset")
    expect(provenanceTag("plan.strategy", derived, {}, facts)).toBe("preset")
    expect(provenanceTag("purchase.legal", p("default"), {}, facts)).toBe(
      "preset"
    )
  })
})
