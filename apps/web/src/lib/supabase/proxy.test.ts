import { isPublicPath } from "./proxy"

describe("isPublicPath", () => {
  it.each([
    ["/sign-in", true],
    ["/share/abc123", true],
    ["/", false],
    ["/finance", false],
    ["/sharex", false],
    ["/deals/1", false],
  ])("%s → %s", (path, expected) => {
    expect(isPublicPath(path)).toBe(expected)
  })
})
