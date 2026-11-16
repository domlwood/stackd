import type { PortfolioDeal } from "./portfolio"
import { inDealView } from "./active"

const deal = (
  status: PortfolioDeal["status"],
  verdict: PortfolioDeal["summary"]["verdict"],
  archivedAt: string | null = null
) => ({ status, archivedAt, summary: { verdict } }) as PortfolioDeal

describe("inDealView", () => {
  it("All shows every unarchived deal, whatever its verdict or status", () => {
    expect(inDealView(deal("active", "doesnt_stack"), "all")).toBe(true)
    expect(inDealView(deal("passed", "stacks"), "all")).toBe(true)
    expect(inDealView(deal("bought", "needs_details"), "all")).toBe(true)
  })

  it("archived deals only appear under Archived", () => {
    const archived = deal("active", "stacks", "2026-11-16T12:00:00Z")
    expect(inDealView(archived, "all")).toBe(false)
    expect(inDealView(archived, "archived")).toBe(true)
    expect(inDealView(deal("active", "stacks"), "archived")).toBe(false)
  })
})
