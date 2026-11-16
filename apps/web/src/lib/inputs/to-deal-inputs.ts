import type {
  BuyerEntity,
  DealInputs,
  Pence,
  Ratio,
  Strategy,
  TaxMode,
} from "@/lib/calc/types"
import { refurbItemCostKey } from "./registry"
import type { ResolvedInputs } from "./resolve"

export type RefurbLine = { id: string; category: string; description: string }

/** Maps resolved key/values onto the calc engine's DealInputs, plus the chosen product ids. */
export function toDealInputs(
  resolved: ResolvedInputs,
  refurbLines: readonly RefurbLine[]
): {
  inputs: DealInputs
  purchaseProductId: string | null
  refiProductId: string | null
} {
  const v = resolved.values
  const money = (key: string) => v[key] as Pence
  const ratio = (key: string) => v[key] as Ratio
  const months = (key: string) => v[key] as number
  const bool = (key: string) => v[key] as boolean

  return {
    purchaseProductId: (v["purchaseFinance.product"] as string | null) ?? null,
    refiProductId: (v["keep.product"] as string | null) ?? null,
    inputs: {
      plan: { strategy: v["plan.strategy"] as Strategy },
      buyer: {
        entity: v["buyer.entity"] as BuyerEntity,
        additionalProperty: bool("buyer.additionalProperty"),
        nonResident: bool("buyer.nonResident"),
        firstTimeBuyer: bool("buyer.firstTimeBuyer"),
        corporateRelief: bool("buyer.corporateRelief"),
      },
      purchase: {
        pricePence: money("purchase.price"),
        legalPence: money("purchase.legal"),
        surveyPence: money("purchase.survey"),
        sourcingPence: money("purchase.sourcing"),
        otherPence: money("purchase.other"),
        completionDate: v["purchase.completionDate"] as string,
      },
      purchaseFinance: { ltv: ratio("purchaseFinance.ltv") },
      refurb: {
        items: refurbLines.map((line) => ({
          ...line,
          costPence: (v[refurbItemCostKey(line.id)] as Pence | undefined) ?? 0,
        })),
        budgetPence: money("refurb.budget"),
        contingency: ratio("refurb.contingency"),
        months: months("refurb.months"),
      },
      holding: {
        councilTaxMonthlyPence: money("holding.councilTaxMonthly"),
        utilitiesMonthlyPence: money("holding.utilitiesMonthly"),
        insuranceMonthlyPence: money("holding.insuranceMonthly"),
        otherMonthlyPence: money("holding.otherMonthly"),
      },
      exit: { gdvPence: money("exit.gdv") },
      flip: {
        agentFee: ratio("flip.agentFee"),
        agentFeeVat: bool("flip.agentFeeVat"),
        saleLegalPence: money("flip.saleLegal"),
        monthsToSell: months("flip.monthsToSell"),
        taxMode: v["flip.taxMode"] as TaxMode,
        otherIncomePence: money("flip.otherIncome"),
      },
      keep: {
        refinanceLtv: ratio("keep.refinanceLtv"),
        rentMonthlyPence: money("keep.rentMonthly"),
        management: ratio("keep.management"),
        voids: ratio("keep.voids"),
        maintenance: ratio("keep.maintenance"),
        insuranceMonthlyPence: money("keep.insuranceMonthly"),
        groundRentServiceMonthlyPence: money("keep.groundRentServiceMonthly"),
        otherMonthlyPence: money("keep.otherMonthly"),
        refinanceLegalPence: money("keep.refinanceLegal"),
      },
    },
  }
}
