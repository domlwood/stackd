import type { PortfolioDeal } from "./portfolio"
import { inDealView, isActiveDeal } from "./active"

const deal = (
  status: PortfolioDeal["status"],
  verdict: PortfolioDeal["summary"]["verdict"],
  archivedAt: string | null = null
) => ({ status, archivedAt, summary: { verdict } }) as PortfolioDeal

describe("isActiveDeal", () => {
  it("keeps deals that stack, are marginal or need details", () => {
    expect(isActiveDeal(deal("active", "stacks"))).toBe(true)
    expect(isActiveDeal(deal("active", "marginal"))).toBe(true)
    expect(isActiveDeal(deal("active", "needs_details"))).toBe(true)
    expect(isActiveDeal(deal("active", null))).toBe(true)
  })

  it("hides deals that don't stack, and ones you've passed on or bought", () => {
    expect(isActiveDeal(deal("bought", "stacks"))).toBe(false)
    expect(isActiveDeal(deal("active", "doesnt_stack"))).toBe(false)
    expect(isActiveDeal(deal("passed", "stacks"))).toBe(false)
  })
})

describe("inDealView", () => {
  const archived = deal("active", "stacks", "2026-11-16T12:00:00Z")
  const passed = deal("passed", "stacks")

  it("archived deals only appear under Archived, whatever their verdict", () => {
    expect(isActiveDeal(archived)).toBe(false)
    expect(inDealView(archived, "active")).toBe(false)
    expect(inDealView(archived, "all")).toBe(false)
    expect(inDealView(archived, "archived")).toBe(true)
  })

  it("All shows everything not archived; Archived shows nothing else", () => {
    expect(inDealView(passed, "active")).toBe(false)
    expect(inDealView(passed, "all")).toBe(true)
    expect(inDealView(passed, "archived")).toBe(false)
  })
})
