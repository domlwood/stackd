import { ercAt, ercRateAt } from "./erc"
import {
  balanceAfter,
  monthlyPayment,
  purchaseFinance,
  redeemPurchaseFinance,
} from "./finance"
import { BRIDGE, CASH, RESI } from "./fixtures"

describe("mortgage maths", () => {
  it("repayment PMT: £100k at 6% over 25 years = £644.30", () => {
    expect(monthlyPayment(10_000_000, 0.06, 300, "repayment")).toBe(64_430)
  })
  it("interest-only payment = P × rate / 12", () => {
    expect(monthlyPayment(22_500_000, 0.05, 300, "interest_only")).toBe(93_750)
  })
  it("zero-rate repayment divides evenly", () => {
    expect(monthlyPayment(1_200_000, 0, 12, "repayment")).toBe(100_000)
  })
  it("balance falls to zero at the end of the term and stays at P for interest-only", () => {
    expect(balanceAfter(10_000_000, 0.06, 300, "repayment", 300)).toBe(0)
    expect(balanceAfter(10_000_000, 0.06, 300, "interest_only", 120)).toBe(
      10_000_000
    )
  })
  it("balance after 12 months matches the amortisation formula", () => {
    // P(1+i)^12 − PMT((1+i)^12 − 1)/i with i = 0.005: 106,167.78 − 7,947.82 = 98,219.96
    expect(balanceAfter(10_000_000, 0.06, 300, "repayment", 12)).toBe(9_821_996)
  })
})

describe("ERC", () => {
  it("looks up the band by month, [from, to)", () => {
    expect(ercRateAt(RESI.ercBands, 0)).toBe(0.03)
    expect(ercRateAt(RESI.ercBands, 11)).toBe(0.03)
    expect(ercRateAt(RESI.ercBands, 12)).toBe(0.02)
    expect(ercRateAt(RESI.ercBands, 24)).toBe(0)
  })
  it("charges % of the balance; zero with no product or no schedule", () => {
    expect(ercAt(RESI, 10_000_000, 6).pence).toBe(300_000)
    expect(ercAt(null, 10_000_000, 6).pence).toBe(0)
    expect(ercAt({ ...RESI, ercBands: [] }, 10_000_000, 6).pence).toBe(0)
  })
})

describe("purchase finance", () => {
  it("cash: no loan, no fees", () => {
    const f = purchaseFinance(CASH, 20_000_000, 0.75)
    expect(f.netAdvancePence).toBe(0)
    expect(redeemPurchaseFinance(f, 6).totalPence).toBe(0)
  })

  it("caps the LTV at the product's maximum", () => {
    expect(purchaseFinance(BRIDGE, 20_000_000, 0.9).grossLoanPence).toBe(
      14_000_000
    )
  })

  it("retained bridge: interest and fee deducted from the advance", () => {
    // gross £140k; retained 1% × 12 = £16,800; fee 2% = £2,800 → net £120,400
    const f = purchaseFinance(BRIDGE, 20_000_000, 0.7)
    expect(f.retainedInterestPence).toBe(1_680_000)
    expect(f.netAdvancePence).toBe(12_040_000)
    expect(f.upfrontCashFeesPence).toBe(160_000)
    expect(f.monthlyCashPaymentPence).toBe(0)
  })

  it("retained bridge redeemed early refunds unused interest; min term applies", () => {
    const f = purchaseFinance(BRIDGE, 20_000_000, 0.7)
    // month 8: charged £11,200, refund £5,600, exit £1,400 → £135,800
    expect(redeemPurchaseFinance(f, 8).totalPence).toBe(13_580_000)
    // month 1: min term 3 → charged £4,200, refund £12,600 → £128,800
    expect(redeemPurchaseFinance(f, 1).totalPence).toBe(12_880_000)
  })

  it("retained bridge held past the retained period owes the extra interest", () => {
    const f = purchaseFinance(BRIDGE, 20_000_000, 0.7)
    // 14 months: charged £19,600 vs £16,800 retained → £2,800 due
    expect(redeemPurchaseFinance(f, 14).accruedInterestPence).toBe(280_000)
  })

  it("serviced bridge: monthly cash payment, min-term top-up on early exit", () => {
    const f = purchaseFinance(
      { ...BRIDGE, interestMode: "serviced" },
      20_000_000,
      0.7
    )
    expect(f.monthlyCashPaymentPence).toBe(140_000)
    expect(f.netAdvancePence).toBe(14_000_000 - 280_000)
    // exit at month 2, min term 3 → one month top-up £1,400
    expect(redeemPurchaseFinance(f, 2).accruedInterestPence).toBe(140_000)
    expect(redeemPurchaseFinance(f, 6).accruedInterestPence).toBe(0)
  })

  it("rolled bridge compounds monthly", () => {
    const f = purchaseFinance(
      { ...BRIDGE, interestMode: "rolled" },
      20_000_000,
      0.7
    )
    // 140,000 × 1.01^6 (1.0615202) = 148,612.82 → interest £8,612.82
    expect(redeemPurchaseFinance(f, 6).accruedInterestPence).toBe(861_282)
  })

  it("arrangement fee paid in cash when not added", () => {
    const f = purchaseFinance(
      { ...BRIDGE, feeAddedToLoan: false },
      20_000_000,
      0.7
    )
    expect(f.upfrontCashFeesPence).toBe(160_000 + 280_000)
    expect(f.netAdvancePence).toBe(14_000_000 - 1_680_000)
  })

  it("residential mortgage: ERC at sale, fee in cash", () => {
    const f = purchaseFinance(RESI, 20_000_000, 0.75)
    expect(f.netAdvancePence).toBe(15_000_000)
    expect(f.upfrontCashFeesPence).toBe(99_900)
    const r = redeemPurchaseFinance(f, 8)
    expect(r.ercPence).toBe(Math.round((r.totalPence - r.ercPence) * 0.03))
    expect(redeemPurchaseFinance(f, 30).ercPence).toBe(0)
  })

  it("redemption breakdown is additive", () => {
    const r = redeemPurchaseFinance(purchaseFinance(BRIDGE, 20_000_000, 0.7), 8)
    expect(r.figure.children?.reduce((t, c) => t + c.value, 0)).toBe(
      r.totalPence
    )
  })
})
