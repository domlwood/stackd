"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

import { FormField } from "@/components/blocks/form-field"
import { OptionSelect } from "@/components/blocks/option-select"
import { changeDealStatus } from "../actions"
import { DEAL_STATUS_LABELS, type DealStatus } from "../schemas"

/**
 * Status picker. Moving to "passed" asks for a reason (stored for later learning).
 * Used on the deal page and on pipeline cards.
 */
export function useStatusChange(
  dealId: string,
  onChanged?: (status: DealStatus) => void
) {
  const [pending, startTransition] = useTransition()
  const [askReason, setAskReason] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const commit = (status: DealStatus, why?: string) =>
    startTransition(async () => {
      onChanged?.(status)
      const result = await changeDealStatus({ dealId, status, reason: why })
      if (!result.ok) {
        if (result.fieldErrors?.reason) {
          setError(result.fieldErrors.reason)
          setAskReason(true)
        }
        toast.error(result.message)
        return
      }
      setAskReason(false)
      setReason("")
      toast.success(`Moved to ${DEAL_STATUS_LABELS[status]}`)
    })

  const request = (status: DealStatus) => {
    if (status === "passed") {
      setError(null)
      setAskReason(true)
    } else commit(status)
  }

  const dialog = (
    <Dialog open={askReason} onOpenChange={setAskReason}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pass on this deal?</DialogTitle>
          <DialogDescription>
            Say why. Your reasons are kept so you can spot patterns later.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!reason.trim()) {
              setError("Say why you're passing.")
              return
            }
            commit("passed", reason.trim())
          }}
          className="flex flex-col gap-4"
        >
          <FormField
            id="passed-reason"
            label="Reason"
            error={error ?? undefined}
          >
            <Textarea
              id="passed-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={Boolean(error)}
              autoFocus
              placeholder="e.g. Survey found subsidence; numbers don't work at asking."
            />
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAskReason(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              Pass on deal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

  return { request, pending, dialog }
}

export function StatusControl({
  dealId,
  status,
}: {
  dealId: string
  status: DealStatus
}) {
  const [optimistic, setOptimistic] = useState(status)
  const [prev, setPrev] = useState(status)
  if (prev !== status) {
    setPrev(status)
    setOptimistic(status)
  }
  const { request, dialog } = useStatusChange(dealId, setOptimistic)
  return (
    <>
      <div className="w-36">
        <OptionSelect
          id="deal-status"
          value={optimistic}
          onValueChange={(v) => request(v)}
          options={DEAL_STATUS_LABELS}
        />
      </div>
      {dialog}
    </>
  )
}
