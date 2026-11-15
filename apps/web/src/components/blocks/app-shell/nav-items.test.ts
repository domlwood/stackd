import { activeNavItem } from "./nav-items"

describe("activeNavItem", () => {
  it.each([
    ["/", "Pipeline"],
    ["/deals/abc/analysis", "Pipeline"],
    ["/finance", "Finance"],
    ["/finance/products/1", "Finance"],
    ["/settings", "Settings"],
  ])("%s → %s", (path, title) => {
    expect(activeNavItem(path)?.title).toBe(title)
  })
})
