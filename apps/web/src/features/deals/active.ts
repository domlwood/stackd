import type { PortfolioDeal } from "./portfolio"

/**
 * The Deals page's default "Active" view: deals still in play. Hides deals
 * you've passed on, bought or archived, and ones that don't stack; keeps ones that
 * stack, are marginal or still need details.
 */
export function isActiveDeal(
  deal: Pick<PortfolioDeal, "status" | "archivedAt"> & {
    summary: Pick<PortfolioDeal["summary"], "verdict">
  }
): boolean {
  return (
    !deal.archivedAt &&
    deal.status === "active" &&
    deal.summary.verdict !== "doesnt_stack"
  )
}

export const DEAL_VIEWS = {
  active: "Active",
  all: "All",
  archived: "Archived",
} as const
export type DealView = keyof typeof DEAL_VIEWS

/** Active: still in play. All: everything not archived. Archived: only archived. */
export function inDealView(
  deal: Parameters<typeof isActiveDeal>[0],
  view: DealView
): boolean {
  if (view === "archived") return Boolean(deal.archivedAt)
  if (deal.archivedAt) return false
  return view === "all" || isActiveDeal(deal)
}
