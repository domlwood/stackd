import { arrangementFee, monthlyPayment, type Redemption } from "./finance"
import { MONTHS_PER_YEAR, negate, pct, ratioOf, roundPence } from "./money"
import type {
  CalcProduct,
  DealInputs,
  Figure,
  Months,
  Pence,
  Ratio,
  Warning,
} from "./types"

export type LoanConstraint = "ltv" | "icr" | "product_ltv"

export type KeepResult =
  | { available: false; reason: string }
  | {
      available: true
      months: Months
      newLoanPence: Pence
      /** Total refinance loan including any fee added. */
      totalLoanPence: Pence
      bindingConstraint: LoanConstraint
      maxLoanByIcrPence: Pence
      cashReleasedPence: Pence
      cashInvestedPence: Pence
      moneyLeftInPence: Pence
      mortgagePaymentPence: Pence
      monthlyCashflowPence: Pence
      icr: number
      icrPass: boolean
      grossYield: Ratio
      netYield: Ratio
      /** Infinity when no money is left in. */
      roce: number
      warnings: Warning[]
      figures: {
        moneyLeftIn: Figure
        cashflow: Figure
        newLoan: Figure
        icr: Figure
        roce: Figure
        cashReleased: Figure
      }
    }

/** Months until refinance: after refurb, but not before the lender's minimum ownership period. */
export function refinanceMonth(
  refurbMonths: Months,
  refi: CalcProduct | null
): Months {
  return Math.max(refurbMonths, refi?.minMonthsOwnedForRevaluation ?? 0)
}

/**
 * Keep: refinance onto a BTL mortgage at the post-refurb value, then let.
 *   Max total loan = min(GDV × refi LTV, GDV × product max LTV, rent×12 / (ICR × stress rate))
 *   Cash released  = new loan − cash refi fees − purchase-loan redemption
 *   Money left in  = cash invested − cash released
 *   Cashflow       = rent − mortgage − rent × (mgmt + voids + maintenance) − insurance − ground rent/service − other
 *   ROCE           = 12 × cashflow ÷ money left in
 */
export function analyseKeep(args: {
  inputs: DealInputs
  refi: CalcProduct | null
  months: Months
  redemption: Redemption
  cashInvested: Figure
}): KeepResult {
  const { inputs, refi, months, redemption, cashInvested } = args
  if (!refi)
    return {
      available: false,
      reason: "Choose a refinance product to see the keep exit.",
    }
  if (refi.type !== "btl" && refi.type !== "residential") {
    return {
      available: false,
      reason:
        "The refinance product must be a buy-to-let (or residential) mortgage.",
    }
  }

  const gdv = inputs.exit.gdvPence
  const rent = inputs.keep.rentMonthlyPence
  const annualRent = rent * MONTHS_PER_YEAR
  const warnings: Warning[] = []

  const capLtv = pct(gdv, inputs.keep.refinanceLtv)
  const capProduct =
    refi.maxLtv === null ? Number.POSITIVE_INFINITY : pct(gdv, refi.maxLtv)
  const stress = refi.stressRate ?? refi.rate ?? 0
  const icrThreshold = refi.icrThreshold ?? 0
  const capIcr =
    icrThreshold > 0 && stress > 0
      ? Math.floor(annualRent / (icrThreshold * stress))
      : Number.POSITIVE_INFINITY

  const caps: { constraint: LoanConstraint; pence: number }[] = [
    { constraint: "ltv", pence: capLtv },
    { constraint: "product_ltv", pence: capProduct },
    { constraint: "icr", pence: capIcr },
  ]
  const binding = caps.reduce((min, c) => (c.pence < min.pence ? c : min))
  const totalCap = Math.max(0, binding.pence)

  // Fee added to the loan counts towards the cap: solve net + fee(net) ≤ cap.
  let newLoanPence: Pence
  if (refi.feeAddedToLoan) {
    newLoanPence =
      refi.arrangementFeeKind === "pct"
        ? roundPence(totalCap / (1 + refi.arrangementFeePct))
        : Math.max(0, totalCap - refi.arrangementFeePence)
  } else {
    newLoanPence = totalCap
  }
  const fee = refi.feeAddedToLoan
    ? totalCap - newLoanPence
    : arrangementFee(refi, newLoanPence)
  const totalLoanPence = refi.feeAddedToLoan ? totalCap : newLoanPence
  const cashFeesPence =
    (refi.feeAddedToLoan ? 0 : fee) +
    refi.brokerFeePence +
    refi.valuationFeePence +
    inputs.keep.refinanceLegalPence

  const cashReleasedPence = newLoanPence - cashFeesPence - redemption.totalPence
  const moneyLeftInPence = cashInvested.value - cashReleasedPence

  const mortgagePaymentPence = monthlyPayment(
    totalLoanPence,
    refi.rate ?? 0,
    refi.termMonths ?? 1,
    refi.repayment ?? "interest_only"
  )
  const lettingCosts = [
    {
      key: "management",
      label: "Management",
      pence: pct(rent, inputs.keep.management),
      input: "keep.management",
    },
    {
      key: "voids",
      label: "Voids",
      pence: pct(rent, inputs.keep.voids),
      input: "keep.voids",
    },
    {
      key: "maintenance",
      label: "Maintenance",
      pence: pct(rent, inputs.keep.maintenance),
      input: "keep.maintenance",
    },
    {
      key: "insurance",
      label: "Insurance",
      pence: inputs.keep.insuranceMonthlyPence,
      input: "keep.insuranceMonthly",
    },
    {
      key: "groundRent",
      label: "Ground rent / service charge",
      pence: inputs.keep.groundRentServiceMonthlyPence,
      input: "keep.groundRentServiceMonthly",
    },
    {
      key: "other",
      label: "Other",
      pence: inputs.keep.otherMonthlyPence,
      input: "keep.otherMonthly",
    },
  ]
  const monthlyCashflowPence =
    rent - mortgagePaymentPence - lettingCosts.reduce((t, c) => t + c.pence, 0)

  // Stress test is judged at the loan you're aiming for (LTV-limited); if it fails the loan is cut to the ICR max.
  const targetLoanPence = Math.min(capLtv, capProduct)
  const icr = ratioOf(
    annualRent,
    targetLoanPence * stress,
    Number.POSITIVE_INFINITY
  )
  const icrPass = icrThreshold === 0 || stress === 0 || icr >= icrThreshold
  const grossYield = ratioOf(annualRent, gdv, 0)
  const netYield = ratioOf(monthlyCashflowPence * MONTHS_PER_YEAR, gdv, 0)
  const roce =
    moneyLeftInPence <= 0
      ? Number.POSITIVE_INFINITY
      : (monthlyCashflowPence * MONTHS_PER_YEAR) / moneyLeftInPence

  if (inputs.refurb.months < months) {
    warnings.push({
      code: "refinance_wait",
      message: `The lender won't use a new valuation until month ${months}, so you'll hold for ${months - inputs.refurb.months} month(s) after the refurb finishes.`,
      inputs: ["refurb.months", "keep.product"],
    })
  }
  if (!icrPass) {
    warnings.push({
      code: "icr_fail",
      message: `At your target LTV the rent doesn't pass the lender's stress test, so the loan is cut to £${Math.round(capIcr / 100).toLocaleString("en-GB")}.`,
      inputs: ["keep.rentMonthly", "keep.refinanceLtv"],
    })
  }

  const constraintLabel: Record<LoanConstraint, string> = {
    ltv: `your ${+(inputs.keep.refinanceLtv * 100).toFixed(1)}% LTV`,
    product_ltv: "the product's maximum LTV",
    icr: "the rental stress test (ICR)",
  }

  const newLoan: Figure = {
    key: "keep.newLoan",
    label: "Refinance loan",
    value: newLoanPence,
    unit: "pence",
    formula: `Limited by ${constraintLabel[binding.constraint]}`,
    inputs: [
      "keep.refinanceLtv",
      "keep.rentMonthly",
      "keep.product",
      "exit.gdv",
    ],
    children: [
      {
        key: "keep.cap.ltv",
        label: "Max by LTV",
        value: capLtv,
        unit: "pence",
        inputs: ["keep.refinanceLtv", "exit.gdv"],
      },
      ...(Number.isFinite(capIcr)
        ? [
            {
              key: "keep.cap.icr",
              label: "Max by rental stress test",
              value: capIcr,
              unit: "pence" as const,
              inputs: ["keep.rentMonthly"],
            },
          ]
        : []),
      ...(fee
        ? [
            {
              key: "keep.fee",
              label: refi.feeAddedToLoan
                ? "Arrangement fee (added to loan)"
                : "Arrangement fee (paid in cash)",
              value: fee,
              unit: "pence" as const,
            },
          ]
        : []),
    ],
  }

  const cashReleased: Figure = {
    key: "keep.cashReleased",
    label: "Cash released on refinance",
    value: cashReleasedPence,
    unit: "pence",
    formula: "New loan − refinance costs − purchase loan redemption",
    children: [
      newLoan,
      {
        key: "keep.refiCosts",
        label: "Refinance costs paid in cash",
        value: -cashFeesPence,
        unit: "pence",
        inputs: ["keep.refinanceLegal"],
      },
      negate(redemption.figure),
    ],
  }

  const moneyLeftIn: Figure = {
    key: "keep.moneyLeftIn",
    label: "Money left in",
    value: moneyLeftInPence,
    unit: "pence",
    formula: "Cash invested − cash released",
    note:
      moneyLeftInPence < 0
        ? "Negative: you pull out more than you put in."
        : undefined,
    children: [cashInvested, negate(cashReleased)],
  }

  const cashflow: Figure = {
    key: "keep.cashflow",
    label: "Monthly cashflow",
    value: monthlyCashflowPence,
    unit: "pence",
    formula: "Rent − mortgage − letting costs",
    children: [
      {
        key: "keep.rent",
        label: "Rent",
        value: rent,
        unit: "pence",
        inputs: ["keep.rentMonthly"],
      },
      {
        key: "keep.mortgage",
        label: `Mortgage (${refi.repayment === "repayment" ? "repayment" : "interest only"})`,
        value: -mortgagePaymentPence,
        unit: "pence",
        inputs: ["keep.product"],
      },
      ...lettingCosts
        .filter((c) => c.pence > 0)
        .map((c) => ({
          key: `keep.cost.${c.key}`,
          label: c.label,
          value: -c.pence,
          unit: "pence" as const,
          inputs: [c.input],
        })),
    ],
  }

  return {
    available: true,
    months,
    newLoanPence,
    totalLoanPence,
    bindingConstraint: binding.constraint,
    maxLoanByIcrPence: capIcr,
    cashReleasedPence,
    cashInvestedPence: cashInvested.value,
    moneyLeftInPence,
    mortgagePaymentPence,
    monthlyCashflowPence,
    icr,
    icrPass,
    grossYield,
    netYield,
    roce,
    warnings,
    figures: {
      moneyLeftIn,
      cashflow,
      newLoan,
      cashReleased,
      icr: {
        key: "keep.icr",
        label: "Interest cover (ICR)",
        value: icr,
        unit: "multiple",
        formula: `Annual rent ÷ (target loan × ${+(stress * 100).toFixed(2)}% stress rate); lender needs ${+(icrThreshold * 100).toFixed(0)}%`,
        inputs: ["keep.rentMonthly", "keep.product"],
      },
      roce: {
        key: "keep.roce",
        label: "Return on capital employed",
        value: roce,
        unit: "ratio",
        formula: "Annual cashflow ÷ money left in",
        children: [cashflow, moneyLeftIn],
      },
    },
  }
}
