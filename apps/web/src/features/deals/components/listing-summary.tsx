import Link from "next/link"
import { ExternalLinkIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"

import { ProvenanceChip } from "@/features/analysis/components/provenance-chip"
import { formatDate } from "@/lib/format/date"
import { formatMoney } from "@/lib/format/money"
import { PROPERTY_TYPE_LABELS, TENURE_LABELS } from "../schemas"
import type { Deal } from "../types"
import { DealMap } from "./deal-map"

/** Compact listing context above the deal's analysis, using saved listing data. */
export function ListingSummary({ deal }: { deal: Deal }) {
  const photos = [
    ...new Set([
      ...(deal.coverPhotoUrl ? [deal.coverPhotoUrl] : []),
      ...deal.photoUrls,
    ]),
  ]
  // Only Rightmove imports carry listing photos; manual entries never do.
  const imported = Boolean(deal.listingUrl && photos.length)
  const meta = [
    imported ? `Imported from Rightmove ${formatDate(deal.createdAt)}` : null,
    deal.agent,
    deal.listedAt ? `Listed ${formatDate(deal.listedAt)}` : null,
    photos.length ? `${photos.length} photos` : null,
  ].filter(Boolean)
  const facts = [
    deal.propertyType ? PROPERTY_TYPE_LABELS[deal.propertyType] : null,
    deal.beds !== null ? `${deal.beds} bedrooms` : null,
    deal.baths !== null ? `${deal.baths} bathrooms` : null,
    deal.tenure ? TENURE_LABELS[deal.tenure] : null,
    deal.floorAreaSqm !== null ? `${deal.floorAreaSqm} m²` : null,
  ].filter(Boolean)

  return (
    <Card size="sm" className="min-w-0 gap-0 overflow-hidden py-0">
      {photos.length ? (
        <div
          role="region"
          aria-label="Listing photos"
          tabIndex={0}
          className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto p-1.5 pb-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {photos.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- remote listing photos
            <img
              key={url}
              src={url}
              alt={`${deal.addressLine} — photo ${i + 1} of ${photos.length}`}
              loading={i === 0 ? "eager" : "lazy"}
              className="aspect-[4/3] h-24 w-auto shrink-0 snap-start rounded-md object-cover sm:h-28"
            />
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-medium text-muted-foreground">
                Asking price
              </h3>
              {imported && deal.askingPricePence !== null ? (
                <ProvenanceChip tag="imported" />
              ) : null}
            </div>
            <p className="text-xl font-semibold tabular-nums">
              {deal.askingPricePence !== null
                ? formatMoney(deal.askingPricePence)
                : "Not provided"}
            </p>
          </div>
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
        {facts.length ? (
          <p className="text-sm text-muted-foreground">{facts.join(" · ")}</p>
        ) : null}
        {deal.description ? (
          <p className="line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">
            {deal.description}
          </p>
        ) : deal.keyFeatures.length ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {deal.keyFeatures.slice(0, 3).join(" · ")}
          </p>
        ) : null}
        {deal.lat !== null && deal.lng !== null ? (
          <DealMap lat={deal.lat} lng={deal.lng} address={deal.addressLine} />
        ) : null}
        {/* One sentence that wraps naturally; the link gets its own line on phones. */}
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          {meta.length ? (
            <p className="text-pretty">{meta.join(" · ")}</p>
          ) : null}
          <Link
            href={`/deals/${deal.id}/listing`}
            className="shrink-0 self-start underline underline-offset-2 hover:text-foreground sm:self-auto"
          >
            Full property details
          </Link>
        </div>
      </div>
    </Card>
  )
}
