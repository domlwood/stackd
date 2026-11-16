import { activeNavItem } from "./nav-items"

describe("activeNavItem", () => {
  it.each([
    ["/deals/new", "Deals"],
    ["/", "Deals"],
    ["/deals/abc", "Deals"],
    ["/deals/abc/listing", "Deals"],
    ["/finance", "Finance"],
    ["/finance/products/1", "Finance"],
  ])("%s → %s", (path, title) => {
    expect(activeNavItem(path)?.title).toBe(title)
  })

  it("has no item for hidden pages", () => {
    expect(activeNavItem("/settings")).toBeUndefined()
  })
})
