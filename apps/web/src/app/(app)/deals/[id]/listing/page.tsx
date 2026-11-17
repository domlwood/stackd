import type { Metadata } from "next"

import { ListingDetails } from "@/features/deals/components/listing-details"
import { ListingSummary } from "@/features/deals/components/listing-summary"
import { getDealWorkspace } from "@/features/deals/queries"

export const metadata: Metadata = { title: "Property details" }

/** Photos, map and the details we hold (editable). Reached from the deal header. */
export default async function DealListingPage({
  params,
}: PageProps<"/deals/[id]/listing">) {
  const { id } = await params
  const data = await getDealWorkspace(id)
  return (
    <div className="flex flex-col gap-6">
      <ListingSummary deal={data.deal} />
      <ListingDetails />
    </div>
  )
}
