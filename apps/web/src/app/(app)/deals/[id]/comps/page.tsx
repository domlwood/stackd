import { ScaleIcon } from "lucide-react"

import { PagePlaceholder } from "@/components/blocks/page-placeholder"

export default function DealCompsPage() {
  return (
    <PagePlaceholder
      icon={ScaleIcon}
      title="No comparables yet"
      description="Recently sold similar properties will appear here once comps are fetched for this postcode. For now, set the end value (GDV) in the Flip section."
    />
  )
}
