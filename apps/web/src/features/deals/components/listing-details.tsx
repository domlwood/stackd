"use client"

import { ExternalLinkIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { formatDate } from "@/lib/format/date"
import { useDealBase } from "@/features/analysis/components/deal-provider"
import { updateDealDetails } from "../actions"
import { DealDetailsForm, dealToDetails } from "./deal-details-form"

export function ListingDetails() {
  const { data } = useDealBase()
  const { deal } = data
  return (
    <div className="flex flex-col gap-4">
      {deal.photoUrls.length ? (
        <div
          className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 md:mx-0 md:px-0"
          aria-label="Listing photos"
        >
          {deal.photoUrls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- remote listing photos
            <img
              key={url}
              src={url}
              alt={`Photo ${i + 1} of ${deal.photoUrls.length}`}
              loading="lazy"
              className="aspect-[4/3] w-[80%] shrink-0 snap-start rounded-lg object-cover sm:w-80"
            />
          ))}
        </div>
      ) : null}

      {deal.keyFeatures.length || deal.listingUrl ? (
        <Card size="sm" className="px-4">
          {deal.keyFeatures.length ? (
            <>
              <h3 className="text-sm font-medium">Key features</h3>
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {deal.keyFeatures.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {deal.agent ? <span>{deal.agent}</span> : null}
            {deal.listedAt ? (
              <span>Listed {formatDate(deal.listedAt)}</span>
            ) : null}
            {deal.listingUrl ? (
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={
                  <a href={deal.listingUrl} target="_blank" rel="noreferrer" />
                }
              >
                <ExternalLinkIcon aria-hidden />
                View listing
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Property details</CardTitle>
        </CardHeader>
        <CardContent>
          <DealDetailsForm
            key={deal.updatedAt}
            initial={dealToDetails(deal)}
            submitLabel="Save details"
            onSubmit={async (values) => {
              const result = await updateDealDetails(deal.id, values)
              if (result.ok) toast.success("Details saved")
              return result.ok ? { ok: true } : result
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
