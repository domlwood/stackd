import type { DealInputs, Figure, Months, Pence } from "./types"

/** Holding = months × (finance paid monthly + council tax + utilities + insurance + other). */
export function holdingCosts(
  holding: DealInputs["holding"],
  monthlyFinancePence: Pence,
  months: Months,
  keyPrefix: string
): { totalPence: Pence; figure: Figure } {
  const lines = [
    {
      key: "finance",
      label: "Finance payments",
      monthly: monthlyFinancePence,
      input: "purchaseFinance.product",
    },
    {
      key: "councilTax",
      label: "Council tax",
      monthly: holding.councilTaxMonthlyPence,
      input: "holding.councilTaxMonthly",
    },
    {
      key: "utilities",
      label: "Utilities",
      monthly: holding.utilitiesMonthlyPence,
      input: "holding.utilitiesMonthly",
    },
    {
      key: "insurance",
      label: "Insurance",
      monthly: holding.insuranceMonthlyPence,
      input: "holding.insuranceMonthly",
    },
    {
      key: "other",
      label: "Other",
      monthly: holding.otherMonthlyPence,
      input: "holding.otherMonthly",
    },
  ]
  const children: Figure[] = lines
    .filter((l) => l.monthly > 0)
    .map((l) => ({
      key: `${keyPrefix}.holding.${l.key}`,
      label: `${l.label} (${months} × £${(l.monthly / 100).toLocaleString("en-GB")})`,
      value: l.monthly * months,
      unit: "pence" as const,
      inputs: [l.input],
    }))
  const totalPence = children.reduce((t, c) => t + c.value, 0)
  return {
    totalPence,
    figure: {
      key: `${keyPrefix}.holding`,
      label: `Holding costs (${months} months)`,
      value: totalPence,
      unit: "pence",
      formula: "Months × monthly costs",
      children,
    },
  }
}
