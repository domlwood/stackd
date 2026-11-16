import type { RuleSetRecord } from "./schema"

/**
 * England & NI tax rules, verified against gov.uk on 2026-11-15.
 * Seeded into tax_rule_set; the app reads rules from the DB, these are the defaults.
 */
const VERIFIED_AT = "2026-11-15T00:00:00Z"

export const ENGLAND_RULES: readonly RuleSetRecord[] = [
  {
    kind: "sdlt",
    // Residential bands from 1 Apr 2025; 5% higher-rates surcharge from 31 Oct 2024.
    effectiveFrom: "2025-04-01",
    effectiveTo: null,
    sourceUrl:
      "https://www.gov.uk/stamp-duty-land-tax/residential-property-rates",
    verifiedAt: VERIFIED_AT,
    data: {
      bands: [
        { fromPence: 0, toPence: 12_500_000, rate: 0 },
        { fromPence: 12_500_000, toPence: 25_000_000, rate: 0.02 },
        { fromPence: 25_000_000, toPence: 92_500_000, rate: 0.05 },
        { fromPence: 92_500_000, toPence: 150_000_000, rate: 0.1 },
        { fromPence: 150_000_000, toPence: null, rate: 0.12 },
      ],
      additionalDwellingSurcharge: 0.05,
      additionalDwellingMinPricePence: 4_000_000,
      nonResidentSurcharge: 0.02,
      corporateFlatRate: 0.17,
      corporateFlatRateAbovePence: 50_000_000,
      // No SDLT up to £300k; 5% on £300,001–£500,000; no relief over £500k.
      firstTimeBuyer: {
        nilRateUptoPence: 30_000_000,
        rate: 0.05,
        maxPricePence: 50_000_000,
      },
    },
  },
  {
    kind: "income_tax",
    effectiveFrom: "2026-04-06",
    effectiveTo: "2027-04-05",
    sourceUrl: "https://www.gov.uk/income-tax-rates",
    verifiedAt: VERIFIED_AT,
    data: {
      personalAllowancePence: 1_257_000,
      allowanceTaperThresholdPence: 10_000_000,
      allowanceTaperRate: 0.5,
      bands: [
        { name: "Basic rate", uptoPence: 3_770_000, rate: 0.2 },
        { name: "Higher rate", uptoPence: 12_514_000, rate: 0.4 },
        { name: "Additional rate", uptoPence: null, rate: 0.45 },
      ],
      // https://www.gov.uk/self-employed-national-insurance-rates
      class4Ni: {
        lowerProfitsLimitPence: 1_257_000,
        upperProfitsLimitPence: 5_027_000,
        mainRate: 0.06,
        upperRate: 0.02,
      },
    },
  },
  {
    kind: "cgt",
    effectiveFrom: "2026-04-06",
    effectiveTo: "2027-04-05",
    sourceUrl: "https://www.gov.uk/capital-gains-tax/rates",
    verifiedAt: VERIFIED_AT,
    data: {
      annualExemptAmountPence: 300_000,
      basicRate: 0.18,
      higherRate: 0.24,
      basicRateBandPence: 3_770_000,
    },
  },
  {
    kind: "corp_tax",
    effectiveFrom: "2023-04-01",
    effectiveTo: null,
    sourceUrl:
      "https://www.gov.uk/government/publications/rates-and-allowances-corporation-tax",
    verifiedAt: VERIFIED_AT,
    data: {
      smallProfitsRate: 0.19,
      mainRate: 0.25,
      lowerLimitPence: 5_000_000,
      upperLimitPence: 25_000_000,
      marginalReliefFraction: 0.015,
    },
  },
  {
    kind: "vat",
    effectiveFrom: "2011-01-04",
    effectiveTo: null,
    sourceUrl: "https://www.gov.uk/vat-rates",
    verifiedAt: null,
    data: { standardRate: 0.2 },
  },
]
