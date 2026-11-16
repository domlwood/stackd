import { inputDef } from "@/lib/inputs/registry"
import { formatFigureValue, formatInputValue } from "./format"

describe("formatFigureValue", () => {
  it("formats by unit", () => {
    expect(formatFigureValue({ unit: "pence", value: 2_796_000 })).toBe(
      "£27,960"
    )
    expect(
      formatFigureValue({ unit: "pence", value: -582_000 }, { signed: true })
    ).toBe("−£5,820")
    expect(formatFigureValue({ unit: "ratio", value: 0.21438 })).toBe("21.4%")
    expect(formatFigureValue({ unit: "multiple", value: 1.4545 })).toBe("145%")
    expect(
      formatFigureValue({ unit: "ratio", value: Number.POSITIVE_INFINITY })
    ).toBe("∞")
    expect(formatFigureValue({ unit: "months", value: 1 })).toBe("1 month")
  })
})

describe("formatInputValue", () => {
  const def = (key: string) => {
    const d = inputDef(key)
    if (!d) throw new Error(key)
    return d
  }
  it("formats each kind", () => {
    expect(formatInputValue(def("purchase.price"), 20_000_000)).toBe("£200,000")
    expect(formatInputValue(def("keep.voids"), 0.05)).toBe("5%")
    expect(formatInputValue(def("buyer.entity"), "ltd")).toBe("Limited company")
    expect(formatInputValue(def("buyer.nonResident"), false)).toBe("No")
    expect(formatInputValue(def("purchaseFinance.product"), null)).toBe("None")
    expect(
      formatInputValue(def("purchaseFinance.product"), "p1", [
        { id: "p1", lender: "Example", name: "Bridge" },
      ])
    ).toBe("Example · Bridge")
    expect(formatInputValue(def("refurb_item:abc.cost"), 300_000)).toBe(
      "£3,000"
    )
  })
})
