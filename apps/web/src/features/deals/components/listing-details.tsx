"use client"

import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { useDeal } from "@/features/analysis/components/deal-provider"
import { updateDealDetails } from "../actions"
import { DealDetailsForm, dealToDetails } from "./deal-details-form"

export function ListingDetails() {
  const { data } = useDeal()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Property details</CardTitle>
      </CardHeader>
      <CardContent>
        <DealDetailsForm
          key={data.deal.updatedAt}
          initial={dealToDetails(data.deal)}
          submitLabel="Save details"
          onSubmit={async (values) => {
            const result = await updateDealDetails(data.deal.id, values)
            if (result.ok) toast.success("Details saved")
            return result.ok ? { ok: true } : result
          }}
        />
      </CardContent>
    </Card>
  )
}
