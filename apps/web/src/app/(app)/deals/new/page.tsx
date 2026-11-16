import type { Metadata } from "next"

import { NewDealFlow } from "@/features/capture/components/new-deal-flow"
import { getNewDealOptions } from "@/features/capture/options"

export const metadata: Metadata = { title: "Analyse a property" }

/** Full-page import: deep links and shared ?url= links. The + button opens the same flow in a sheet. */
export default async function NewDealPage({
  searchParams,
}: PageProps<"/deals/new">) {
  const { url } = await searchParams
  const { products, defaultProductId } = await getNewDealOptions()
  return (
    <div className="mx-auto w-full max-w-xl">
      <NewDealFlow
        products={products}
        defaultProductId={defaultProductId}
        initialUrl={typeof url === "string" ? url : undefined}
      />
    </div>
  )
}
