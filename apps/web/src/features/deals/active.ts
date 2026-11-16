import type { PortfolioDeal } from "./portfolio"

/**
 * The Deals page has two views. All (default): every deal that isn't
 * archived, whatever its verdict or status. Archived: only archived deals.
 */
export const DEAL_VIEWS = {
  all: "All",
  archived: "Archived",
} as const
export type DealView = keyof typeof DEAL_VIEWS

export function inDealView(
  deal: Pick<PortfolioDeal, "archivedAt">,
  view: DealView
): boolean {
  return view === "archived" ? Boolean(deal.archivedAt) : !deal.archivedAt
}
