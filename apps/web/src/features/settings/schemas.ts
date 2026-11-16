import { z } from "zod"

const pence = z.number().int()
const ratio = z.number().min(0).max(1)
const months = z.number().int().min(0).max(120)

/** Buy box: thresholds that drive the deal verdict. */
export const buyBoxSchema = z.object({
  /** 0 = no ROI test: the flip is judged on profit alone. */
  minFlipRoi: ratio.default(0),
  minFlipProfitPence: pence.nonnegative().default(2_000_000),
  maxMoneyLeftInPence: pence.nonnegative().default(1_500_000),
  minMonthlyCashflowPence: pence.default(20_000),
  marginalTolerance: ratio.default(0.1),
})

/** Default assumptions used to pre-fill new deals. */
export const defaultsSchema = z.object({
  buyer: z
    .object({
      firstTimeBuyer: z.boolean().default(true),
      additionalProperty: z.boolean().default(false),
      nonResident: z.boolean().default(false),
      corporateRelief: z.boolean().default(true),
    })
    .prefault({}),
  purchase: z
    .object({
      legalPence: pence.nonnegative().default(180_000),
      surveyPence: pence.nonnegative().default(60_000),
      sourcingPence: pence.nonnegative().default(0),
      otherPence: pence.nonnegative().default(0),
      monthsToComplete: months.default(3),
    })
    .prefault({}),
  finance: z
    .object({
      purchaseLtv: ratio.default(0.95),
    })
    .prefault({}),
  refurb: z
    .object({
      contingency: ratio.default(0.1),
      months: months.default(3),
      /** Quick-estimate rates in pence per sq ft, by condition. */
      conditionRatesPencePerSqft: z
        .object({
          light: pence.nonnegative().default(2_500),
          medium: pence.nonnegative().default(4_500),
          heavy: pence.nonnegative().default(7_000),
        })
        .prefault({}),
    })
    .prefault({}),
  holding: z
    .object({
      councilTaxMonthlyPence: pence.nonnegative().default(15_000),
      utilitiesMonthlyPence: pence.nonnegative().default(10_000),
      insuranceMonthlyPence: pence.nonnegative().default(4_000),
      otherMonthlyPence: pence.nonnegative().default(0),
    })
    .prefault({}),
  flip: z
    .object({
      agentFee: ratio.default(0.012),
      agentFeeVat: z.boolean().default(true),
      saleLegalPence: pence.nonnegative().default(150_000),
      monthsToSell: months.default(6),
      /** Other taxable income the flip profit stacks on (income tax / CGT estimates). */
      otherIncomePence: pence.nonnegative().default(5_027_000),
    })
    .prefault({}),
  keep: z
    .object({
      refinanceLtv: ratio.default(0.75),
      management: ratio.default(0.1),
      voids: ratio.default(0.05),
      maintenance: ratio.default(0.05),
      insuranceMonthlyPence: pence.nonnegative().default(3_000),
      /** Used to estimate rent from the end value until a rent figure is entered. */
      grossYield: ratio.default(0.065),
      groundRentServiceMonthlyPence: pence.nonnegative().default(0),
      otherMonthlyPence: pence.nonnegative().default(0),
      refinanceLegalPence: pence.nonnegative().default(100_000),
    })
    .prefault({}),
  comps: z
    .object({
      radiusMetres: z.number().int().min(100).max(5_000).default(1_000),
      windowMonths: months.default(24),
      matchPropertyType: z.boolean().default(true),
    })
    .prefault({}),
})

export const settingsSchema = z.object({
  buyBox: buyBoxSchema.prefault({}),
  defaults: defaultsSchema.prefault({}),
  staleAfterDays: z.number().int().min(1).max(3650).default(90),
  buyerEntity: z.enum(["personal", "ltd"]).default("personal"),
})

export type BuyBox = z.infer<typeof buyBoxSchema>
export type DealDefaults = z.infer<typeof defaultsSchema>
export type WorkspaceSettings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: WorkspaceSettings = settingsSchema.parse({})
