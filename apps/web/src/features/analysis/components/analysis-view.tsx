"use client"

import { TriangleAlertIcon } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"

import { AnalysisSection } from "@/components/blocks/analysis-section"
import { BreakdownTree } from "@/components/blocks/breakdown-tree"
import type { Figure } from "@/lib/calc/types"
import { formatMoney } from "@/lib/format/money"
import { INPUT_DEFS, type InputSection } from "@/lib/inputs/registry"
import { formatInputValue } from "../format"
import { useDeal } from "./deal-provider"
import { InputList } from "./input-list"
import { RefurbEditor } from "./refurb-editor"
import { SensitivityGrid } from "./sensitivity-grid"

const keysFor = (...sections: InputSection[]) =>
  INPUT_DEFS.filter((d) => sections.includes(d.section)).map((d) => d.key)

function Working({
  figures,
  signed,
}: {
  figures: (Figure | null | undefined)[]
  signed?: boolean
}) {
  const { openInput, built } = useDeal()
  const highlight = new Set(built.resolved.diffKeys)
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Working
      </h4>
      {figures
        .filter((f): f is Figure => Boolean(f))
        .map((figure) => (
          <BreakdownTree
            key={figure.key}
            figure={figure}
            onOpenInput={openInput}
            signedChildren={signed}
            highlightKeys={highlight}
          />
        ))}
    </div>
  )
}

function Warnings() {
  const { built, openInput } = useDeal()
  if (!built.ok || built.analysis.warnings.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {built.analysis.warnings.map((w) => (
        <Alert key={w.code} className="border-warning/50">
          <TriangleAlertIcon className="text-warning-foreground" />
          <AlertTitle className="sr-only">Warning</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex-1">{w.message}</span>
            {w.inputs?.[0] ? (
              <Button
                size="sm"
                variant="link"
                className="h-auto p-0"
                onClick={() => openInput(w.inputs?.[0] ?? null)}
              >
                Review
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}

export function AnalysisView() {
  const { built, data } = useDeal()
  if (!built.ok) return null
  const { analysis } = built
  const { flip, keep } = analysis
  const flipHolding = analysis.flip.figures.cashInvested.children?.find(
    (c) => c.key === "flip.holding"
  )
  const keepInvested = keep.available
    ? keep.figures.moneyLeftIn.children?.[0]
    : null
  const keepHolding = keepInvested?.children?.find(
    (c) => c.key === "keep.holding"
  )
  const purchaseProduct = INPUT_DEFS.find(
    (d) => d.key === "purchaseFinance.product"
  )
  const deposit = analysis.flip.figures.cashInvested.children?.find(
    (c) => c.key === "deposit"
  )
  const monthlyHolding =
    data.settings && built.inputs
      ? built.inputs.holding.councilTaxMonthlyPence +
        built.inputs.holding.utilitiesMonthlyPence +
        built.inputs.holding.insuranceMonthlyPence +
        built.inputs.holding.otherMonthlyPence +
        analysis.purchaseFinance.monthlyCashPaymentPence
      : 0

  return (
    <div className="flex flex-col gap-3">
      <Warnings />

      <AnalysisSection
        id="purchase"
        title="Purchase"
        summary={`${formatMoney(built.inputs.purchase.pricePence)} + ${formatMoney(analysis.sdlt.totalPence)} SDLT`}
      >
        <InputList keys={keysFor("purchase")} />
        <InputList title="Buyer" keys={keysFor("buyer")} />
        <Working figures={[analysis.sdlt.figure, analysis.acquisitionCosts]} />
      </AnalysisSection>

      <AnalysisSection
        id="finance"
        title="Purchase finance"
        summary={
          purchaseProduct
            ? formatInputValue(
                purchaseProduct,
                built.resolved.values["purchaseFinance.product"],
                data.products
              )
            : undefined
        }
      >
        <InputList keys={keysFor("finance")} />
        <Working figures={[deposit, analysis.purchaseFinance.figure]} signed />
      </AnalysisSection>

      <AnalysisSection
        id="refurb"
        title="Refurb"
        summary={formatMoney(analysis.refurb.value)}
      >
        <RefurbEditor />
        <InputList keys={keysFor("refurb")} />
        <Working figures={[analysis.refurb]} />
      </AnalysisSection>

      <AnalysisSection
        id="holding"
        title="Holding costs"
        summary={`${formatMoney(monthlyHolding)}/month`}
      >
        <InputList keys={keysFor("holding")} />
        <Working figures={[flipHolding, keepHolding]} />
      </AnalysisSection>

      <AnalysisSection
        id="flip"
        title="Exit A · Flip"
        summary={formatMoney(flip.profitPence)}
        defaultOpen
      >
        <InputList keys={["exit.gdv", ...keysFor("flip")]} />
        <Working figures={[flip.figures.profit, flip.figures.tax]} signed />
      </AnalysisSection>

      <AnalysisSection
        id="keep"
        title="Exit B · Keep"
        summary={
          keep.available
            ? `${formatMoney(Math.max(0, keep.moneyLeftInPence))} left in`
            : "Not set up"
        }
        defaultOpen
      >
        <InputList keys={["exit.gdv", ...keysFor("keep")]} />
        {keep.available ? (
          <>
            <Working
              figures={[keep.figures.moneyLeftIn, keep.figures.cashflow]}
              signed
            />
            <Working
              figures={[
                keep.figures.newLoan,
                keep.figures.icr,
                keep.figures.roce,
              ]}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{keep.reason}</p>
        )}
      </AnalysisSection>

      <AnalysisSection
        id="sensitivity"
        title="Sensitivity"
        summary={`${analysis.sensitivity.length} scenarios`}
      >
        <SensitivityGrid rows={analysis.sensitivity} />
      </AnalysisSection>
    </div>
  )
}
