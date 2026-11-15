"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { FieldGroup } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

import { ConfirmDialog } from "@/components/blocks/confirm-dialog"
import { FormField } from "@/components/blocks/form-field"
import { MoneyInput } from "@/components/blocks/numeric-inputs"
import { OptionSelect } from "@/components/blocks/option-select"
import { ResponsiveSheet } from "@/components/blocks/responsive-sheet"
import { applyServerFieldErrors } from "@/lib/forms"
import type { Member } from "@/features/workspace/queries"
import { deleteFundPot, saveFundPot } from "../actions"
import {
  FUND_POT_KIND_LABELS,
  fundPotSchema,
  type FundPot,
  type FundPotInput,
} from "../schemas"

type FundPotSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pot: FundPot | null
  members: Member[]
  onOptimisticSave: (pot: FundPot) => void
  onOptimisticDelete: (id: string) => void
}

const FORM_ID = "fund-pot-form"

export function FundPotSheet({
  open,
  onOpenChange,
  pot,
  members,
  onOptimisticSave,
  onOptimisticDelete,
}: FundPotSheetProps) {
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const you = members.find((m) => m.isYou)?.userId ?? members[0]?.userId ?? ""

  const form = useForm<FundPotInput>({
    resolver: zodResolver(fundPotSchema),
    values: pot
      ? {
          id: pot.id,
          name: pot.name,
          kind: pot.kind,
          ownerUserId: pot.ownerUserId,
          amountPence: pot.amountPence,
          note: pot.note ?? "",
        }
      : {
          name: "",
          kind: "savings",
          ownerUserId: you,
          amountPence: 0,
          note: "",
        },
    resetOptions: { keepDirtyValues: false },
  })
  const { errors } = form.formState
  const ownerOptions = Object.fromEntries(
    members.map((m) => [
      m.userId,
      m.isYou ? `${m.displayName} (you)` : m.displayName,
    ])
  )

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const optimisticId = values.id ?? `optimistic-${crypto.randomUUID()}`
      onOptimisticSave({
        ...values,
        id: optimisticId,
        updatedAt: new Date().toISOString(),
      })
      const result = await saveFundPot(values)
      if (!result.ok) {
        applyServerFieldErrors(form.setError, result.fieldErrors)
        toast.error(result.message)
        return
      }
      toast.success(values.id ? "Fund pot updated" : "Fund pot added")
      onOpenChange(false)
    })
  })

  const onDelete = () => {
    if (!pot) return
    startTransition(async () => {
      onOptimisticDelete(pot.id)
      const result = await deleteFundPot(pot.id)
      setConfirmOpen(false)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(`Deleted “${pot.name}”`)
      onOpenChange(false)
    })
  }

  return (
    <>
      <ResponsiveSheet
        open={open}
        onOpenChange={onOpenChange}
        title={pot ? "Edit fund pot" : "Add fund pot"}
        description="A named source of cash you can put into deals."
        footer={
          <>
            {pot ? (
              <Button
                variant="destructive"
                className="mr-auto"
                onClick={() => setConfirmOpen(true)}
                disabled={pending}
              >
                <Trash2Icon aria-hidden />
                <span className="max-sm:sr-only">Delete</span>
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              disabled={pending}
              className="max-sm:flex-1"
            >
              {pending ? <Spinner /> : null}
              Save
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <FormField id="pot-name" label="Name" error={errors.name?.message}>
              <Input
                id="pot-name"
                placeholder="e.g. Joint savings"
                aria-invalid={!!errors.name}
                {...form.register("name")}
              />
            </FormField>
            <FormField
              id="pot-amount"
              label="Amount"
              error={errors.amountPence?.message}
            >
              <Controller
                control={form.control}
                name="amountPence"
                render={({ field }) => (
                  <MoneyInput
                    id="pot-amount"
                    value={field.value}
                    onValueChange={(v) => field.onChange(v ?? 0)}
                    onBlur={field.onBlur}
                    aria-invalid={!!errors.amountPence}
                  />
                )}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="pot-owner"
                label="Owner"
                error={errors.ownerUserId?.message}
              >
                <Controller
                  control={form.control}
                  name="ownerUserId"
                  render={({ field }) => (
                    <OptionSelect
                      id="pot-owner"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={ownerOptions}
                    />
                  )}
                />
              </FormField>
              <FormField
                id="pot-kind"
                label="Type"
                error={errors.kind?.message}
              >
                <Controller
                  control={form.control}
                  name="kind"
                  render={({ field }) => (
                    <OptionSelect
                      id="pot-kind"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={FUND_POT_KIND_LABELS}
                    />
                  )}
                />
              </FormField>
            </div>
            <FormField
              id="pot-note"
              label="Note"
              error={errors.note?.message}
              description="Optional, e.g. when it's available."
            >
              <Textarea id="pot-note" rows={2} {...form.register("note")} />
            </FormField>
          </FieldGroup>
        </form>
      </ResponsiveSheet>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete “${pot?.name ?? ""}”?`}
        description="This removes the pot from your buying power. The change is kept in the activity log."
        confirmLabel="Delete pot"
        onConfirm={onDelete}
        pending={pending}
      />
    </>
  )
}
