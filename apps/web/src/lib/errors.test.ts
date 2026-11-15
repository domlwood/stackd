import { z } from "zod"

import { dbErrorMessage, zodFieldErrors } from "./errors"

describe("errors", () => {
  it("maps known Postgres codes to plain language", () => {
    expect(dbErrorMessage({ code: "42501", message: "rls" })).toBe(
      "You don't have permission to do that."
    )
  })
  it("falls back to a generic message without leaking internals", () => {
    expect(
      dbErrorMessage({ code: "XX000", message: "internal stack trace" })
    ).not.toMatch(/stack/)
  })
  it("flattens zod issues by path, keeping the first message", () => {
    const schema = z.object({
      a: z.string().min(2, "too short"),
      b: z.array(z.object({ c: z.number() })),
    })
    const result = schema.safeParse({ a: "x", b: [{ c: "nope" }] })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(zodFieldErrors(result.error)).toMatchObject({
        a: "too short",
        "b.0.c": expect.any(String),
      })
  })
})
