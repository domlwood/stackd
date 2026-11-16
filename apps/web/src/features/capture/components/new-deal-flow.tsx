"use client"

import { useRouter } from "next/navigation"
import type { Route } from "next"
import Link from "next/link"
import { useState, useTransition } from "react"
import { CircleAlertIcon, DownloadIcon, LinkIcon } from "lucide-react"
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
  const [open, setOpen] = useState(false)
  const chosen = products.find((p) => p.id === value)
  // With a default chosen, finance is one quiet line; change it only if you need to.
  if (chosen && !open) {
    return (
      <p className="text-sm text-muted-foreground">
        Finance: {chosen.lender} · {chosen.name}{" "}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0"
          onClick={() => setOpen(true)}
        >
          Change
        </Button>
      </p>
    )
  }
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
 * Analyse a property: paste a Rightmove link → imported deal (option A), or
 * enter details manually (option B, also the fallback when a listing can't be read).
 */
/** Card on the full page; bare inside the + sheet, which supplies its own title. */
function Panel({
  variant,
  title,
  description,
  showTitle = true,
  children,
}: {
  variant: "page" | "sheet"
  title: string
  description: string
  showTitle?: boolean
  children: React.ReactNode
}) {
  if (variant === "sheet") {
    return (
      <section className="flex flex-col gap-4">
        {showTitle ? <h3 className="font-medium">{title}</h3> : null}
        <p className="text-sm text-muted-foreground">{description}</p>
        {children}
      </section>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}

export function NewDealFlow({
  products,
  defaultProductId,
  initialUrl,
  variant = "page",
  onDone,
}: {
  products: FinanceProduct[]
  defaultProductId: string | null
  initialUrl?: string
  variant?: "page" | "sheet"
  /** Called just before navigating to the new (or existing) deal. */
  onDone?: () => void
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
              : "Imported. Check your offer price, refurb cost and end value.")
        )
        // The page segment starts below the shared deal summary. Explicitly
        // target the document top instead of Next's automatic segment scroll.
        onDone?.()
        router.push(`/deals/${result.dealId}#top` as Route)
        return
      }
      setFallback({ message: result.message, prefill: result.prefill })
      setMode("manual")
    })

  return (
    <div className="flex flex-col gap-4">
      {mode === "link" ? (
        <Panel
          variant={variant}
          showTitle={false}
          title="Analyse a property"
          description="Turn a listing into an investment analysis. We'll import the details for you to review, then you set your numbers."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              analyse()
            }}
          >
            <FieldGroup>
              <FormField id="new-url" label="Rightmove property URL">
                <InputGroup>
                  <InputGroupAddon>
                    <LinkIcon aria-hidden />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="new-url"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    placeholder="Paste a Rightmove property URL"
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
                {pending ? <Spinner /> : <DownloadIcon aria-hidden />}
                {pending ? "Importing property…" : "Import property"}
              </Button>
              <p aria-live="polite" className="sr-only">
                {pending ? "Importing property" : ""}
              </p>
            </FieldGroup>
          </form>
        </Panel>
      ) : (
        <Panel
          variant={variant}
          title="Enter details manually"
          description="Everything else is worked out from your presets."
        >
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
            initial={fallback?.prefill ?? { ...EMPTY_DETAILS, listingUrl: url }}
            submitLabel="Create deal"
            onSubmit={async (details) => {
              const result = await createDealManually({
                details,
                productId: chosenProduct,
              })
              if (!result.ok) return result
              toast.success(
                "Deal created. Check your offer price, refurb cost and end value."
              )
              onDone?.()
              router.push(`/deals/${result.data.id}#top` as Route)
              return { ok: true }
            }}
          />
        </Panel>
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
