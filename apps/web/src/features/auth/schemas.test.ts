import { safeRedirectPath, signInSchema } from "./schemas"

describe("safeRedirectPath", () => {
  it.each([
    [undefined, "/today"],
    ["/finance", "/finance"],
    ["https://evil.example", "/today"],
    ["//evil.example", "/today"],
    ["/\\evil.example", "/today"],
  ])("%s → %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected)
  })
})

describe("signInSchema", () => {
  it("requires a valid email and a password", () => {
    const result = signInSchema.safeParse({ email: "nope", password: "" })
    expect(result.success).toBe(false)
  })
})
