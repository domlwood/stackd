"use client"

import { useRouter } from "next/navigation"
import type { Route } from "next"
import Link from "next/link"
import { useState, useTransition } from "react"
import { CircleAlertIcon, LinkIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { FieldGroup } from "@workspace/ui/components/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Spinner } from "@workspace/ui/components/spinner"

import { FormField } from "@/components/blocks/form-field"
import { OptionSelect } from "@/components/blocks/option-select"
import {
  DealDetailsForm,
  EMPTY_DETAILS,
} from "@/features/deals/components/deal-details-form"
import type { DealDetailsInput } from "@/features/deals/schemas"
import {
  PRODUCT_TYPE_LABELS,
  type FinanceProduct,
} from "@/features/finance/schemas"
import { captureFromLink, createDealManually } from "../actions"

const NONE = "none"

function ProductPicker({
  products,
  value,
  onChange,
}: {
  products: FinanceProduct[]
  value: string
  onChange: (v: string) => void
}) {
  const options: Record<string, string> = Object.fromEntries(
    products.map((p) => [
      p.id,
      `${p.lender} · ${p.name} (${PRODUCT_TYPE_LABELS[p.type]})`,
    ])
  )
  options[NONE] = "Decide later"
  return (
    <FormField
      id="new-product"
      label="Purchase finance"
      description={
        products.length ? undefined : (
          <Link href="/finance?tab=products" className="underline">
            Add a finance product first
          </Link>
        )
      }
    >
      <OptionSelect
        id="new-product"
        value={value}
        onValueChange={onChange}
        options={options}
      />
    </FormField>
  )
}

/**
 * New deal: paste a Rightmove link + pick finance → analysed deal (option A),
 * or enter details manually (option B, also the fallback when a listing can't be read).
 */
export function NewDealFlow({
  products,
  defaultProductId,
  initialUrl,
}: {
  products: FinanceProduct[]
  defaultProductId: string | null
  initialUrl?: string
}) {
  const router = useRouter()
  const [mode, setMode] = useState<"link" | "manual">("link")
  const [url, setUrl] = useState(initialUrl ?? "")
  const [productId, setProductId] = useState(defaultProductId ?? NONE)
  const [fallback, setFallback] = useState<{
    message: string
    prefill: DealDetailsInput
  } | null>(null)
  const [pending, startTransition] = useTransition()
  const chosenProduct = productId === NONE ? null : productId

  const analyse = () =>
    startTransition(async () => {
      const result = await captureFromLink({ url, productId: chosenProduct })
      if (result.ok) {
        toast.success(
          result.message ??
            (result.existing
              ? "Opened the existing deal"
              : "Analysed. Add your refurb cost and end value.")
        )
        router.push(`/deals/${result.dealId}` as Route)
        return
      }
      setFallback({ message: result.message, prefill: result.prefill })
      setMode("manual")
    })

  return (
    <div className="flex flex-col gap-4">
      {mode === "link" ? (
        <Card>
          <CardHeader>
            <CardTitle>Add from Rightmove</CardTitle>
            <CardDescription>
              Paste a listing link and choose your finance. We&apos;ll read the
              listing and run the numbers with your presets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                analyse()
              }}
            >
              <FieldGroup>
                <FormField id="new-url" label="Rightmove link">
                  <InputGroup>
                    <InputGroupAddon>
                      <LinkIcon aria-hidden />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="new-url"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      placeholder="https://www.rightmove.co.uk/properties/…"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      autoFocus={!initialUrl}
                      required
                    />
                  </InputGroup>
                </FormField>
                <ProductPicker
                  products={products}
                  value={productId}
                  onChange={setProductId}
                />
                <Button
                  type="submit"
                  disabled={pending || !url.trim()}
                  className="max-sm:w-full sm:self-start"
                >
                  {pending ? <Spinner /> : <SparklesIcon aria-hidden />}
                  {pending ? "Reading the listing…" : "Analyse"}
                </Button>
                <p aria-live="polite" className="sr-only">
                  {pending ? "Reading the listing" : ""}
                </p>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Enter details manually</CardTitle>
            <CardDescription>
              Everything else is worked out from your presets.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {fallback ? (
              <Alert className="border-warning/50">
                <CircleAlertIcon className="text-warning-foreground" />
                <AlertDescription>{fallback.message}</AlertDescription>
              </Alert>
            ) : null}
            <ProductPicker
              products={products}
              value={productId}
              onChange={setProductId}
            />
            <DealDetailsForm
              key={fallback ? "fallback" : "blank"}
              initial={
                fallback?.prefill ?? { ...EMPTY_DETAILS, listingUrl: url }
              }
              submitLabel="Create deal"
              onSubmit={async (details) => {
                const result = await createDealManually({
                  details,
                  productId: chosenProduct,
                })
                if (!result.ok) return result
                toast.success(
                  "Deal created. Add your refurb cost and end value."
                )
                router.push(`/deals/${result.data.id}` as Route)
                return { ok: true }
              }}
            />
          </CardContent>
        </Card>
      )}
      <Button
        variant="link"
        className="self-center"
        onClick={() => setMode(mode === "link" ? "manual" : "link")}
      >
        {mode === "link"
          ? "Enter details manually instead"
          : "Paste a Rightmove link instead"}
      </Button>
    </div>
  )
}
