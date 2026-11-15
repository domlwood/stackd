import type { Metadata } from "next"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { NewDealForm } from "@/features/deals/components/new-deal-form"

export const metadata: Metadata = { title: "New deal" }

export default function NewDealPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>New deal</CardTitle>
          <CardDescription>
            Enter the property details. You&apos;ll set the numbers on the next
            screen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewDealForm />
        </CardContent>
      </Card>
    </div>
  )
}
