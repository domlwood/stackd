import { ercAt } from "./erc"
import { MONTHS_PER_YEAR, pct, roundPence } from "./money"
import type { CalcProduct, Figure, Months, Pence, Ratio } from "./types"

// ---------------------------------------------------------------------------
// Mortgage maths
// ---------------------------------------------------------------------------

/** Monthly payment. Repayment: P·i / (1 − (1+i)^−n); interest-only: P·i. */
export function monthlyPayment(
  principalPence: Pence,
  annualRate: Ratio,
  termMonths: Months,
  repayment: "repayment" | "interest_only"
): Pence {
  if (principalPence <= 0) return 0
  const i = annualRate / MONTHS_PER_YEAR
  if (repayment === "interest_only") return roundPence(principalPence * i)
  if (i === 0) return roundPence(principalPence / termMonths)
  return roundPence((principalPence * i) / (1 - (1 + i) ** -termMonths))
}

/** Outstanding balance after `m` payments: P(1+i)^m − PMT·((1+i)^m − 1)/i. */
export function balanceAfter(
  principalPence: Pence,
  annualRate: Ratio,
  termMonths: Months,
  repayment: "repayment" | "interest_only",
  m: Months
): Pence {
  if (principalPence <= 0) return 0
  if (repayment === "interest_only") return principalPence
  const months = Math.min(m, termMonths)
  const i = annualRate / MONTHS_PER_YEAR
  if (i === 0)
    return roundPence(principalPence - (principalPence / termMonths) * months)
  const growth = (1 + i) ** months
  const payment = (principalPence * i) / (1 - (1 + i) ** -termMonths)
  return Math.max(
    0,
    roundPence(principalPence * growth - (payment * (growth - 1)) / i)
  )
}

export function arrangementFee(product: CalcProduct, loanPence: Pence): Pence {
  return product.arrangementFeeKind === "pct"
    ? pct(loanPence, product.arrangementFeePct)
    : product.arrangementFeePence
}

// ---------------------------------------------------------------------------
// Purchase finance
// ---------------------------------------------------------------------------

/** What the purchase loan looks like at completion. */
export type PurchaseFinance = {
  product: CalcProduct | null
  /** Loan the lender advances against (LTV applies to this). */
  grossLoanPence: Pence
  arrangementFeePence: Pence
  /** Interest deducted up front (retained bridging only). */
  retainedInterestPence: Pence
  /** Months of interest retained up front. */
  retainedMonths: Months
  /** Cash actually received at completion. */
  netAdvancePence: Pence
  /** Fees paid in cash at completion (arrangement if not added, broker, valuation). */
  upfrontCashFeesPence: Pence
  /** Monthly finance cost paid in cash while holding (serviced interest / mortgage payment). */
  monthlyCashPaymentPence: Pence
  figure: Figure
}

const FINANCE_INPUTS = [
  "purchaseFinance.product",
  "purchaseFinance.ltv",
  "purchase.price",
]

export function purchaseFinance(
  product: CalcProduct | null,
  pricePence: Pence,
  requestedLtv: Ratio
): PurchaseFinance {
  if (!product || product.type === "cash") {
    return {
      product,
      grossLoanPence: 0,
      arrangementFeePence: 0,
      retainedInterestPence: 0,
      retainedMonths: 0,
      netAdvancePence: 0,
      upfrontCashFeesPence: 0,
      monthlyCashPaymentPence: 0,
      figure: {
        key: "purchaseFinance.netAdvance",
        label: "Loan advance",
        value: 0,
        unit: "pence",
        formula: "Cash purchase: no borrowing",
        inputs: FINANCE_INPUTS,
      },
    }
  }

  const ltv = Math.min(requestedLtv, product.maxLtv ?? requestedLtv)
  const grossLoanPence = pct(pricePence, ltv)
  const fee = arrangementFee(product, grossLoanPence)
  const otherFees = product.brokerFeePence + product.valuationFeePence

  if (product.type === "bridging") {
    const r = product.monthlyRate ?? 0
    const retainedMonths =
      product.interestMode === "retained"
        ? (product.termMonths ?? product.minTermMonths ?? 0)
        : 0
    const retainedInterestPence = pct(grossLoanPence, r * retainedMonths)
    const feeDeducted = product.feeAddedToLoan ? fee : 0
    const netAdvancePence = grossLoanPence - retainedInterestPence - feeDeducted
    const monthlyCashPaymentPence =
      product.interestMode === "serviced" ? pct(grossLoanPence, r) : 0
    return {
      product,
      grossLoanPence,
      arrangementFeePence: fee,
      retainedInterestPence,
      retainedMonths,
      netAdvancePence,
      upfrontCashFeesPence: otherFees + (product.feeAddedToLoan ? 0 : fee),
      monthlyCashPaymentPence,
      figure: {
        key: "purchaseFinance.netAdvance",
        label: "Net bridging advance",
        value: netAdvancePence,
        unit: "pence",
        formula: "Gross loan − retained interest − fee deducted",
        inputs: FINANCE_INPUTS,
        children: [
          {
            key: "purchaseFinance.gross",
            label: `Gross loan (${+(ltv * 100).toFixed(2)}% LTV)`,
            value: grossLoanPence,
            unit: "pence",
          },
          ...(retainedInterestPence
            ? [
                {
                  key: "purchaseFinance.retained",
                  label: `Retained interest (${retainedMonths} months)`,
                  value: -retainedInterestPence,
                  unit: "pence" as const,
                },
              ]
            : []),
          ...(feeDeducted
            ? [
                {
                  key: "purchaseFinance.feeDeducted",
                  label: "Arrangement fee deducted",
                  value: -feeDeducted,
                  unit: "pence" as const,
                },
              ]
            : []),
        ],
      },
    }
  }

  // Residential / BTL mortgage used for the purchase. Fee added → capitalised on top of the loan.
  const loanPence = grossLoanPence + (product.feeAddedToLoan ? fee : 0)
  const monthlyCashPaymentPence = monthlyPayment(
    loanPence,
    product.rate ?? 0,
    product.termMonths ?? 1,
    product.repayment ?? "repayment"
  )
  return {
    product,
    grossLoanPence: loanPence,
    arrangementFeePence: fee,
    retainedInterestPence: 0,
    retainedMonths: 0,
    netAdvancePence: grossLoanPence,
    upfrontCashFeesPence: otherFees + (product.feeAddedToLoan ? 0 : fee),
    monthlyCashPaymentPence,
    figure: {
      key: "purchaseFinance.netAdvance",
      label: "Mortgage advance",
      value: grossLoanPence,
      unit: "pence",
      formula: product.feeAddedToLoan
        ? "Price × LTV (fee added on top of the loan)"
        : "Price × LTV",
      inputs: FINANCE_INPUTS,
    },
  }
}

/** Cost of clearing the purchase loan at month `m` (sale or refinance). */
export type Redemption = {
  totalPence: Pence
  /** Interest charged over the hold that hasn't been paid in cash monthly. */
  accruedInterestPence: Pence
  /** Total interest the hold cost (paid monthly or not). */
  interestCostPence: Pence
  exitFeePence: Pence
  ercPence: Pence
  figure: Figure
}

export function redeemPurchaseFinance(
  finance: PurchaseFinance,
  m: Months
): Redemption {
  const { product, grossLoanPence: gross } = finance
  if (!product || product.type === "cash" || gross === 0) {
    return {
      totalPence: 0,
      accruedInterestPence: 0,
      interestCostPence: 0,
      exitFeePence: 0,
      ercPence: 0,
      figure: {
        key: "redemption",
        label: "Loan redemption",
        value: 0,
        unit: "pence",
      },
    }
  }

  if (product.type === "bridging") {
    const r = product.monthlyRate ?? 0
    const chargedMonths = Math.max(m, product.minTermMonths ?? 0)
    const exitFeePence = pct(gross, product.exitFeePct ?? 0)
    const principalOwed = gross
    let interestDue = 0
    let interestCostPence = 0
    let retainedRefund = 0

    if (product.interestMode === "rolled") {
      const rolled = roundPence(gross * (1 + r) ** chargedMonths)
      interestDue = rolled - gross
      interestCostPence = interestDue
    } else if (product.interestMode === "retained") {
      interestCostPence = pct(gross, r * chargedMonths)
      retainedRefund = Math.max(
        0,
        finance.retainedInterestPence - interestCostPence
      )
      interestDue = Math.max(
        0,
        interestCostPence - finance.retainedInterestPence
      )
    } else {
      // Serviced: paid monthly for m months; top up to the minimum term on redemption.
      interestCostPence = pct(gross, r * chargedMonths)
      interestDue = pct(gross, r * Math.max(0, chargedMonths - m))
    }

    const erc = ercAt(product, principalOwed, m)
    const totalPence =
      principalOwed + interestDue + exitFeePence + erc.pence - retainedRefund
    return {
      totalPence,
      accruedInterestPence: interestDue,
      interestCostPence,
      exitFeePence,
      ercPence: erc.pence,
      figure: {
        key: "redemption",
        label: `Bridging redemption at month ${m}`,
        value: totalPence,
        unit: "pence",
        formula:
          "Loan + interest due + exit fee + ERC − unused retained interest",
        inputs: ["purchaseFinance.product"],
        children: [
          {
            key: "redemption.loan",
            label: "Loan",
            value: principalOwed,
            unit: "pence",
          },
          ...(interestDue
            ? [
                {
                  key: "redemption.interest",
                  label: "Interest due",
                  value: interestDue,
                  unit: "pence" as const,
                },
              ]
            : []),
          ...(exitFeePence
            ? [
                {
                  key: "redemption.exitFee",
                  label: "Exit fee",
                  value: exitFeePence,
                  unit: "pence" as const,
                },
              ]
            : []),
          ...(erc.pence
            ? [
                {
                  key: "redemption.erc",
                  label: `Early repayment charge (${+(erc.rate * 100).toFixed(2)}%)`,
                  value: erc.pence,
                  unit: "pence" as const,
                },
              ]
            : []),
          ...(retainedRefund
            ? [
                {
                  key: "redemption.refund",
                  label: "Unused retained interest refunded",
                  value: -retainedRefund,
                  unit: "pence" as const,
                },
              ]
            : []),
        ],
      },
    }
  }

  const repayment = product.repayment ?? "repayment"
  const balance = balanceAfter(
    gross,
    product.rate ?? 0,
    product.termMonths ?? 1,
    repayment,
    m
  )
  const erc = ercAt(product, balance, m)
  const interestCostPence = Math.max(
    0,
    finance.monthlyCashPaymentPence * m - (gross - balance)
  )
  const totalPence = balance + erc.pence
  return {
    totalPence,
    accruedInterestPence: 0,
    interestCostPence,
    exitFeePence: 0,
    ercPence: erc.pence,
    figure: {
      key: "redemption",
      label: `Mortgage redemption at month ${m}`,
      value: totalPence,
      unit: "pence",
      formula: "Outstanding balance + ERC",
      inputs: ["purchaseFinance.product"],
      children: [
        {
          key: "redemption.balance",
          label: "Outstanding balance",
          value: balance,
          unit: "pence",
        },
        ...(erc.pence
          ? [
              {
                key: "redemption.erc",
                label: `Early repayment charge (${+(erc.rate * 100).toFixed(2)}%)`,
                value: erc.pence,
                unit: "pence" as const,
              },
            ]
          : []),
      ],
    },
  }
}
