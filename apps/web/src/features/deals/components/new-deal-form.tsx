"use client"

import { useRouter } from "next/navigation"
import type { Route } from "next"
import { toast } from "sonner"

import { createDeal } from "../actions"
import { DealDetailsForm, EMPTY_DETAILS } from "./deal-details-form"

export function NewDealForm() {
  const router = useRouter()
  return (
    <DealDetailsForm
      initial={EMPTY_DETAILS}
      submitLabel="Create deal"
      onSubmit={async (values) => {
        const result = await createDeal(values)
        if (result.ok) {
          toast.success("Deal created. Now fill in the numbers.")
          router.push(`/deals/${result.data.id}` as Route)
          return { ok: true }
        }
        return result
      }}
    />
  )
}
