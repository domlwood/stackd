import { pct, roundPence, sum } from "./money"
import type { SdltRules } from "./rules/schema"
import type { BuyerSituation, DealInputs, Figure, Pence } from "./types"

export type SdltResult = {
  totalPence: Pence
  basis: "standard" | "higher_rates" | "corporate_flat" | "first_time_buyer"
  /** Moving home before the old one sells: the surcharge you can claim back. */
  reclaimablePence: Pence
  figure: Figure
}

const SDLT_INPUTS = [
  "purchase.price",
  "buyer.situation",
  "buyer.entity",
  "buyer.nonResident",
  "buyer.corporateRelief",
]

/** Situations that only make sense for a home you'll live in, and for an investment. */
export const HOME_SITUATIONS = [
  "first_home",
  "moving_home",
  "moving_home_unsold",
] as const satisfies readonly BuyerSituation[]
export const INVESTMENT_SITUATIONS = [
  "no_other_property",
  "additional",
] as const satisfies readonly BuyerSituation[]

/**
 * Only a person can buy a home to live in, and first-time buyer relief needs
 * exactly that. A situation saved for the other mode is read as its nearest
 * equivalent, so relief can never apply to an investment or a company.
 */
export function normaliseBuyer(
  liveIn: boolean,
  buyer: DealInputs["buyer"]
): { liveIn: boolean; buyer: DealInputs["buyer"] } {
  const home = liveIn && buyer.entity === "personal"
  const s = buyer.situation
  const situation: BuyerSituation = home
    ? s === "no_other_property"
      ? "moving_home"
      : s === "additional"
        ? "moving_home_unsold"
        : s
    : s === "moving_home_unsold"
      ? "additional"
      : s === "first_home" || s === "moving_home"
        ? "no_other_property"
        : s
  return { liveIn: home, buyer: { ...buyer, situation } }
}

/** First-time buyer relief applies to a personal first home at or under the price cap. */
export function firstTimeBuyerReliefApplies(
  buyer: DealInputs["buyer"],
  pricePence: Pence,
  rules: SdltRules
): boolean {
  return (
    buyer.situation === "first_home" &&
    buyer.entity === "personal" &&
    pricePence <= rules.firstTimeBuyer.maxPricePence
  )
}

function formatBand(fromPence: Pence, toPence: Pence | null): string {
  const pounds = (p: Pence) => `£${(p / 100).toLocaleString("en-GB")}`
  return toPence === null
    ? `Over ${pounds(fromPence)}`
    : `${pounds(fromPence)}–${pounds(toPence)}`
}

/**
 * Stamp Duty Land Tax (England & NI, residential).
 *  - Banded: Σ max(0, min(P, upper) − lower) × (band rate + surcharges)
 *  - Higher rates (+surcharge on every band) when you'll own another home
 *    (additional, or moving before the old home sells: reclaimable), or as a
 *    company, and P ≥ the minimum price (£40k)
 *  - Non-resident surcharge on top when applicable
 *  - Company buying above £500k without relief: flat rate (17%) on the whole price
 *  - First-time buyer (personal first home, ≤ £500k): 0% to £300k, 5% above
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
      reclaimablePence: 0,
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

  if (firstTimeBuyerReliefApplies(buyer, pricePence, rules)) {
    const ftb = rules.firstTimeBuyer
    const bands = [
      { from: 0, to: ftb.nilRateUptoPence, rate: nonResident },
      {
        from: ftb.nilRateUptoPence,
        to: ftb.maxPricePence,
        rate: ftb.rate + nonResident,
      },
    ]
    const children: Figure[] = bands.map((band, index) => ({
      key: `sdlt.ftb.${index}`,
      label: `${formatBand(band.from, band.to)} at ${+(band.rate * 100).toFixed(2)}%`,
      value: roundPence(
        Math.max(0, Math.min(pricePence, band.to) - band.from) * band.rate
      ),
      unit: "pence",
    }))
    const totalPence = sum(children.map((c) => c.value))
    return {
      totalPence,
      basis: "first_time_buyer",
      reclaimablePence: 0,
      figure: {
        key: "sdlt",
        label: "Stamp duty",
        value: totalPence,
        unit: "pence",
        formula: `First-time buyer relief${nonResident ? " + non-resident surcharge" : ""}`,
        inputs: SDLT_INPUTS,
        note: "Relief needs every buyer to be a first-time buyer who intends to live in the property as their main home.",
        children: children.filter((c) => c.value > 0),
      },
    }
  }

  const personalHigher =
    buyer.situation === "additional" || buyer.situation === "moving_home_unsold"
  const higherRates =
    (personalHigher || buyer.entity === "ltd") &&
    pricePence >= rules.additionalDwellingMinPricePence
  const higherSurcharge = higherRates ? rules.additionalDwellingSurcharge : 0
  const surcharge = higherSurcharge + nonResident
  // Replacing your main home: HMRC refunds the surcharge once the old one sells (within 3 years).
  const reclaimablePence =
    higherRates &&
    buyer.entity === "personal" &&
    buyer.situation === "moving_home_unsold"
      ? pct(pricePence, higherSurcharge)
      : 0
  const reason =
    buyer.entity === "ltd"
      ? "company purchase"
      : buyer.situation === "moving_home_unsold"
        ? "you'll own two homes until the old one sells"
        : "you'll own another home"

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
  const standardWhy =
    buyer.entity === "personal" && buyer.situation === "first_home"
      ? "First-time buyer relief stops above £" +
        (rules.firstTimeBuyer.maxPricePence / 100).toLocaleString("en-GB") +
        ", so standard rates apply."
      : undefined
  return {
    totalPence,
    basis: higherRates ? "higher_rates" : "standard",
    reclaimablePence,
    figure: {
      key: "sdlt",
      label: "Stamp duty",
      value: totalPence,
      unit: "pence",
      formula: higherRates
        ? `Banded rates + ${(rules.additionalDwellingSurcharge * 100).toFixed(0)}% higher-rates surcharge (${reason})${nonResident ? " + non-resident surcharge" : ""}`
        : `Banded rates${nonResident ? " + non-resident surcharge" : ""}`,
      inputs: SDLT_INPUTS,
      note:
        reclaimablePence > 0
          ? `You can claim back the £${(reclaimablePence / 100).toLocaleString("en-GB")} surcharge if you sell your previous home within 3 years.`
          : standardWhy,
      children: children.filter((c) => c.value > 0),
    },
  }
}
