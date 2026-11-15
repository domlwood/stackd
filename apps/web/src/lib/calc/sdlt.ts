import { pct, roundPence, sum } from "./money"
import type { SdltRules } from "./rules/schema"
import type { DealInputs, Figure, Pence } from "./types"

export type SdltResult = {
  totalPence: Pence
  basis: "standard" | "higher_rates" | "corporate_flat"
  figure: Figure
}

const SDLT_INPUTS = [
  "purchase.price",
  "buyer.entity",
  "buyer.additionalProperty",
  "buyer.nonResident",
  "buyer.corporateRelief",
]

function formatBand(fromPence: Pence, toPence: Pence | null): string {
  const pounds = (p: Pence) => `£${(p / 100).toLocaleString("en-GB")}`
  return toPence === null
    ? `Over ${pounds(fromPence)}`
    : `${pounds(fromPence)}–${pounds(toPence)}`
}

/**
 * Stamp Duty Land Tax (England & NI, residential).
 *  - Banded: Σ max(0, min(P, upper) − lower) × (band rate + surcharges)
 *  - Higher rates (+surcharge on every band) when buying an additional dwelling,
 *    or as a company, and P ≥ the minimum price (£40k)
 *  - Non-resident surcharge on top when applicable
 *  - Company buying above £500k without relief: flat rate (17%) on the whole price
 */
export function calculateSdlt(
  buyer: DealInputs["buyer"],
  pricePence: Pence,
  rules: SdltRules
): SdltResult {
  const nonResident = buyer.nonResident ? rules.nonResidentSurcharge : 0

  if (
    buyer.entity === "ltd" &&
    pricePence > rules.corporateFlatRateAbovePence &&
    !buyer.corporateRelief
  ) {
    const rate = rules.corporateFlatRate + nonResident
    const totalPence = pct(pricePence, rate)
    return {
      totalPence,
      basis: "corporate_flat",
      figure: {
        key: "sdlt",
        label: "Stamp duty",
        value: totalPence,
        unit: "pence",
        formula: `Price × ${(rate * 100).toFixed(0)}% flat rate (company, no relief)`,
        inputs: SDLT_INPUTS,
        note: "Companies buying residential property over £500,000 pay a flat rate unless a relief (e.g. property rental business) applies.",
      },
    }
  }

  const higherRates =
    (buyer.additionalProperty || buyer.entity === "ltd") &&
    pricePence >= rules.additionalDwellingMinPricePence
  const surcharge =
    (higherRates ? rules.additionalDwellingSurcharge : 0) + nonResident

  const children: Figure[] = rules.bands.map((band, index) => {
    const upper = band.toPence ?? Number.POSITIVE_INFINITY
    const slice = Math.max(0, Math.min(pricePence, upper) - band.fromPence)
    const rate = band.rate + surcharge
    return {
      key: `sdlt.band.${index}`,
      label: `${formatBand(band.fromPence, band.toPence)} at ${+(rate * 100).toFixed(2)}%`,
      value: roundPence(slice * rate),
      unit: "pence",
    }
  })

  const totalPence = sum(children.map((c) => c.value))
  return {
    totalPence,
    basis: higherRates ? "higher_rates" : "standard",
    figure: {
      key: "sdlt",
      label: "Stamp duty",
      value: totalPence,
      unit: "pence",
      formula: higherRates
        ? `Banded rates + ${(rules.additionalDwellingSurcharge * 100).toFixed(0)}% higher-rates surcharge${nonResident ? " + non-resident surcharge" : ""}`
        : `Banded rates${nonResident ? " + non-resident surcharge" : ""}`,
      inputs: SDLT_INPUTS,
      children: children.filter((c) => c.value > 0),
    },
  }
}
