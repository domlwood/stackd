import { firstName, greeting, groupChanged } from "./feed"
import type { FeedDeal, FeedEvent } from "./types"

const deal = (id: string): FeedDeal => ({
  id,
  addressLine: `${id} St`,
  coverPhotoUrl: null,
})
const ev = (
  dealId: string,
  createdAt: string,
  id = Math.random()
): FeedEvent & { dealId: string } => ({
  id,
  dealId,
  action: "create",
  entityType: "deal_note",
  field: null,
  oldValue: null,
  newValue: { kind: "note" },
  actorId: "partner",
  createdAt,
})

describe("groupChanged", () => {
  const deals = new Map([
    ["a", deal("a")],
    ["b", deal("b")],
  ])

  it("only shows changes after your last visit", () => {
    const seen = new Map([["a", "2026-11-17T10:00:00Z"]])
    const out = groupChanged(
      [ev("a", "2026-11-17T09:00:00Z"), ev("a", "2026-11-17T11:00:00Z")],
      seen,
      deals
    )
    expect(out).toHaveLength(1)
    expect(out[0]!.total).toBe(1)
  })

  it("shows everything on a deal you've never opened, newest deal first", () => {
    const out = groupChanged(
      [ev("a", "2026-11-17T09:00:00Z"), ev("b", "2026-11-17T12:00:00Z")],
      new Map(),
      deals
    )
    expect(out.map((g) => g.deal.id)).toEqual(["b", "a"])
  })

  it("caps each deal's lines but keeps the total", () => {
    const events = [1, 2, 3, 4, 5].map((h) =>
      ev("a", `2026-11-17T0${h}:00:00Z`)
    )
    const out = groupChanged(events, new Map(), deals, 3)
    expect(out[0]!.events).toHaveLength(3)
    expect(out[0]!.total).toBe(5)
    expect(out[0]!.events[0]!.createdAt).toBe("2026-11-17T05:00:00Z")
  })

  it("skips deals it doesn't know (archived or deleted)", () => {
    expect(
      groupChanged([ev("z", "2026-11-17T09:00:00Z")], new Map(), deals)
    ).toEqual([])
  })
})

describe("greeting", () => {
  it("uses UK time", () => {
    expect(greeting(new Date("2026-11-17T08:00:00Z"))).toBe("Morning")
    expect(greeting(new Date("2026-11-17T13:00:00Z"))).toBe("Afternoon")
    expect(greeting(new Date("2026-07-17T17:30:00Z"))).toBe("Evening") // 18:30 BST
  })
  it("uses the first name", () => {
    expect(firstName("Alex Smith")).toBe("Alex")
  })
})
