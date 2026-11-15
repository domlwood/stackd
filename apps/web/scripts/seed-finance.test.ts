import { financeProductSchema } from "@/features/finance/schemas"
import { SAMPLE_PRODUCTS } from "./seed-finance"

describe("seed products", () => {
  it("are all valid and cover every product type", () => {
    for (const { product } of SAMPLE_PRODUCTS)
      expect(financeProductSchema.safeParse(product).success).toBe(true)
    expect(new Set(SAMPLE_PRODUCTS.map((s) => s.product.type))).toEqual(
      new Set(["cash", "bridging", "residential", "btl"])
    )
  })
})
