import type { SessionContext } from "@/lib/auth/session"
import { dealDetailsSchema } from "@/features/deals/schemas"
import { DEFAULT_SETTINGS } from "@/features/settings/schemas"
import { initialInputs, prefillFrom } from "./mapping"

const session: SessionContext = {
  userId: "u",
  email: "",
  displayName: "",
  workspaceId: "ws",
  workspaceName: "",
}
const f = <T>(value: T) => ({
  value,
  confidence: "high" as const,
  source: "test",
})

describe("prefillFrom", () => {
  it("maps listing fields to a valid deal form", () => {
    const prefill = prefillFrom(
      {
        addressLine: f("Elm Grove, Sheffield, S7"),
        postcode: f("S7 1CD"),
        askingPricePence: f(21_000_000),
        beds: f(3),
        propertyType: f("semi_detached"),
      },
      "https://www.rightmove.co.uk/properties/1"
    )
    const parsed = dealDetailsSchema.safeParse(prefill)
    expect(parsed.success).toBe(true)
    expect(parsed.data?.askingPricePence).toBe(21_000_000)
  })
  it("leaves missing fields blank so the form asks for them", () => {
    const prefill = prefillFrom({}, "https://www.rightmove.co.uk/properties/1")
    expect(prefill.addressLine).toBe("")
    expect(dealDetailsSchema.safeParse(prefill).success).toBe(false)
  })
})

describe("initialInputs", () => {
  it("sets the chosen product and caps LTV at the product maximum", () => {
    const rows = initialInputs({
      session,
      dealId: "d",
      product: { id: "p", maxLtv: 0.75 },
      settings: DEFAULT_SETTINGS,
    })
    expect(rows.map((r) => [r.key, r.value])).toEqual([
      ["purchaseFinance.product", "p"],
      ["purchaseFinance.ltv", 0.75],
    ])
  })
  it("keeps the preset LTV when the product allows it", () => {
    const rows = initialInputs({
      session,
      dealId: "d",
      product: { id: "p", maxLtv: 0.95 },
      settings: DEFAULT_SETTINGS,
    })
    expect(rows.map((r) => r.key)).toEqual(["purchaseFinance.product"])
  })
  it("records 'decide later' as no product", () => {
    expect(
      initialInputs({
        session,
        dealId: "d",
        product: null,
        settings: DEFAULT_SETTINGS,
      })[0]?.value
    ).toBeNull()
  })
})
