"use client"

import { useId, useState, useTransition, type ReactNode } from "react"
import {
  EllipsisVerticalIcon,
  MessageSquarePlusIcon,
  ExternalLinkIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  ScaleIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { FieldGroup } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import { ConfirmDialog } from "@/components/blocks/confirm-dialog"
import { FormField } from "@/components/blocks/form-field"
import { MoneyInput } from "@/components/blocks/numeric-inputs"
import { ResponsiveSheet } from "@/components/blocks/responsive-sheet"
import { useDealBase } from "@/features/analysis/components/deal-provider"
import { formatDate, formatDateTime, formatRelative } from "@/lib/format/date"
import { formatMoney } from "@/lib/format/money"
import {
  addDealNote,
  deleteDealNote,
  setDealNotePinned,
  updateDealNote,
} from "../actions"
import { SQFT_PER_SQM, summariseComps } from "../comps"
import { COMP_STATUS_LABELS, type CompStatus } from "../schemas"
import type { DealNote } from "../types"

type Kind = DealNote["kind"]

/** The deal's notes page: everything, pinned on top, then newest first. */
export function NotesView({ notes }: { notes: DealNote[] }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Phones add notes from the bar at the bottom; wide screens from here. */}
      <NotesFeed notes={notes} />
    </div>
  )
}

/**
 * The side panel on wide screens: add a note, see the latest. The Notes
 * tab is hidden there, so this is where the conversation lives.
 */
export function NotesPanel({ notes }: { notes: DealNote[] }) {
  const { data } = useDealBase()
  return (
    <section
      aria-labelledby="notes-panel-heading"
      className="flex flex-col gap-3"
    >
      <NotesHeading id="notes-panel-heading" count={notes.length} />
      <Card size="sm" className="px-4">
        <NoteForm dealId={data.deal.id} compact />
      </Card>
      <NotesFeed notes={notes} limit={4} />
    </section>
  )
}

function NotesHeading({ id, count }: { id: string; count: number }) {
  return (
    <h2 id={id} className="text-base font-semibold">
      Notes
      {count ? (
        <span className="ml-1.5 text-sm font-normal text-muted-foreground">
          {count}
        </span>
      ) : null}
    </h2>
  )
}

function EmptyNotes() {
  return (
    <p className="text-sm text-muted-foreground">
      Nothing yet. Share what you find with each other: details from the agent,
      questions, and comparable sales that back up the end value.
    </p>
  )
}

/** Comparables summary, then the notes (optionally the first few, with "Show all"). */
function NotesFeed({ notes, limit }: { notes: DealNote[]; limit?: number }) {
  const { data } = useDealBase()
  const [showAll, setShowAll] = useState(false)
  const summary = summariseComps(notes, data.deal.floorAreaSqm)
  const pinned = notes.filter((n) => n.pinned).length
  const visible =
    showAll || !limit ? notes : notes.slice(0, Math.max(limit, pinned))
  const hidden = notes.length - visible.length
  return (
    <>
      {summary ? <CompSummaryCard summary={summary} /> : null}
      {notes.length === 0 ? (
        <EmptyNotes />
      ) : (
        <ol className="flex flex-col gap-3" aria-label="Notes">
          {visible.map((note) => (
            <li key={note.id}>
              <NoteCard note={note} />
            </li>
          ))}
        </ol>
      )}
      {hidden > 0 || (showAll && limit) ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Show fewer" : `Show all ${notes.length} notes`}
        </Button>
      ) : null}
    </>
  )
}

/**
 * Phones and tablets: an "Add a note" bar pinned to the bottom of the deal,
 * like a message box. Opens the note/comparable form in a sheet.
 */
export function NoteComposerBar() {
  const { data } = useDealBase()
  const [open, setOpen] = useState(false)
  return (
    <div className="sticky bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-10 -mx-4 border-t bg-background/95 px-4 py-2 backdrop-blur supports-backdrop-filter:bg-background/80 md:bottom-0 md:mx-0 md:rounded-t-lg md:border-x xl:hidden">
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center gap-2 rounded-full border bg-card px-4 text-left text-sm text-muted-foreground shadow-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <MessageSquarePlusIcon className="size-4 shrink-0" aria-hidden />
        Add a note…
      </button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title="Add to notes">
        {open ? (
          <NoteForm dealId={data.deal.id} onAdded={() => setOpen(false)} />
        ) : null}
      </ResponsiveSheet>
    </div>
  )
}

function CompSummaryCard({
  summary,
}: {
  summary: NonNullable<ReturnType<typeof summariseComps>>
}) {
  const { data, setInput, pending } = useDealBase()
  const what =
    summary.basis === "sold"
      ? `${summary.count} sold comparable${summary.count === 1 ? "" : "s"}`
      : `${summary.count} asking price${summary.count === 1 ? "" : "s"} (nothing sold yet)`
  const area = data.deal.floorAreaSqm
  const applyEndValue = (pence: number, source: string) =>
    void setInput("exit.gdv", pence, { sourceText: source }).then(
      (ok) => ok && toast.success(`End value set to ${formatMoney(pence)}`)
    )
  return (
    <Card size="sm" className="gap-3 px-4">
      <div className="flex items-start gap-2">
        <ScaleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-sm font-medium">What the comparables say</h2>
          <p className="text-sm text-muted-foreground">
            From {what}: median{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatMoney(summary.medianPricePence)}
            </span>
            {summary.count > 1
              ? ` (${formatMoney(summary.lowPricePence)}–${formatMoney(summary.highPricePence)})`
              : ""}
            .
            {summary.medianPerSqftPence !== null ? (
              <>
                {" "}
                {formatMoney(summary.medianPerSqftPence)}/sq ft
                {summary.impliedValuePence !== null && area
                  ? `, about ${formatMoney(summary.impliedValuePence)} for this property's ${Math.round(area * SQFT_PER_SQM).toLocaleString("en-GB")} sq ft.`
                  : "."}
              </>
            ) : null}
          </p>
          {summary.basis === "listed" ? (
            <p className="text-xs text-muted-foreground">
              Asking prices are often above what things sell for. Add sold
              prices when you can.
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            applyEndValue(summary.medianPricePence, `Median of ${what}`)
          }
        >
          Use {formatMoney(summary.medianPricePence)} as end value
        </Button>
        {summary.impliedValuePence !== null ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              applyEndValue(
                summary.impliedValuePence!,
                `${formatMoney(summary.medianPerSqftPence!)}/sq ft from ${what}`
              )
            }
          >
            Use {formatMoney(summary.impliedValuePence)} (by sq ft)
          </Button>
        ) : null}
      </div>
    </Card>
  )
}

function NoteCard({ note }: { note: DealNote }) {
  const { data, memberName } = useDealBase()
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [pending, startTransition] = useTransition()
  const mine = note.authorId === data.currentUserId
  const edited =
    new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() >
    60_000

  const run = (action: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const result = await action()
      if (!result.ok) toast.error(result.message ?? "Something went wrong.")
    })

  if (editing)
    return (
      <Card size="sm" className="px-4">
        <NoteForm
          dealId={note.dealId}
          note={note}
          onDone={() => setEditing(false)}
        />
      </Card>
    )

  return (
    <Card
      size="sm"
      className="gap-2 px-4"
      aria-label={note.comp ? `Comparable: ${note.comp.address}` : "Note"}
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {memberName(note.authorId)}
          </span>
          <time
            dateTime={note.createdAt}
            title={formatDateTime(note.createdAt)}
          >
            {formatRelative(note.createdAt)}
            {edited ? " · edited" : ""}
          </time>
          {note.comp ? <Badge variant="secondary">Comparable</Badge> : null}
          {note.pinned ? (
            <Badge variant="outline">
              <PinIcon aria-hidden /> Pinned
            </Badge>
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mt-1 -mr-2"
                aria-label="Note actions"
                disabled={pending}
              />
            }
          >
            {pending ? <Spinner /> : <EllipsisVerticalIcon aria-hidden />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                run(() => setDealNotePinned(note.id, !note.pinned))
              }
            >
              {note.pinned ? (
                <PinOffIcon aria-hidden />
              ) : (
                <PinIcon aria-hidden />
              )}
              {note.pinned ? "Unpin" : "Pin to top"}
            </DropdownMenuItem>
            {mine ? (
              <>
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <PencilIcon aria-hidden />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirm(true)}
                >
                  <Trash2Icon aria-hidden />
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {note.comp ? <CompDetails note={note} /> : null}
      {note.body ? (
        <p className="text-sm break-words whitespace-pre-wrap">{note.body}</p>
      ) : null}
      {note.linkUrl ? (
        <a
          href={note.linkUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-1 self-start text-sm text-brand-text underline-offset-4 hover:underline"
        >
          <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{hostOf(note.linkUrl)}</span>
        </a>
      ) : null}

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this note?"
        description="It's removed for both of you. This can't be undone."
        confirmLabel="Delete note"
        pending={pending}
        onConfirm={() =>
          startTransition(async () => {
            const result = await deleteDealNote(note.id)
            setConfirm(false)
            if (!result.ok) toast.error(result.message)
          })
        }
      />
    </Card>
  )
}

function CompDetails({ note }: { note: DealNote }) {
  const comp = note.comp!
  const perSqft = comp.floorAreaSqm
    ? comp.pricePence / (comp.floorAreaSqm * SQFT_PER_SQM)
    : null
  const meta = [
    comp.date
      ? `${comp.status === "sold" ? "Sold" : "Listed"} ${formatDate(comp.date)}`
      : COMP_STATUS_LABELS[comp.status],
    comp.beds !== null ? `${comp.beds} bed` : null,
    comp.floorAreaSqm
      ? `${Math.round(comp.floorAreaSqm * SQFT_PER_SQM).toLocaleString("en-GB")} sq ft`
      : null,
    perSqft !== null ? `${formatMoney(perSqft)}/sq ft` : null,
  ].filter(Boolean)
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="min-w-0 text-sm font-medium break-words">
          {comp.address}
        </span>
        <span className="text-base font-semibold tabular-nums">
          {formatMoney(comp.pricePence)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{meta.join(" · ")}</p>
    </div>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/** Add a note, or edit one (when `note` is given). */
function NoteForm({
  dealId,
  note,
  onDone,
  onAdded,
  compact,
}: {
  dealId: string
  note?: DealNote
  onDone?: () => void
  /** Called after a new note is saved (e.g. to close the sheet). */
  onAdded?: () => void
  /** Side panel: smaller note box. */
  compact?: boolean
}) {
  const comp = note?.comp
  // New entries are always notes; existing comparables can still be edited.
  const kind: Kind = note?.kind ?? "note"
  const [body, setBody] = useState(note?.body ?? "")
  const [linkUrl, setLinkUrl] = useState(note?.linkUrl ?? "")
  const [address, setAddress] = useState(comp?.address ?? "")
  const [price, setPrice] = useState<number | null>(comp?.pricePence ?? null)
  const [status, setStatus] = useState<CompStatus>(comp?.status ?? "sold")
  const [date, setDate] = useState(comp?.date ?? "")
  const [beds, setBeds] = useState(comp?.beds?.toString() ?? "")
  const [sqft, setSqft] = useState(
    comp?.floorAreaSqm
      ? String(Math.round(comp.floorAreaSqm * SQFT_PER_SQM))
      : ""
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  const reset = () => {
    setBody("")
    setLinkUrl("")
    setAddress("")
    setPrice(null)
    setDate("")
    setBeds("")
    setSqft("")
    setErrors({})
  }

  const submit = () =>
    startTransition(async () => {
      const input =
        kind === "note"
          ? { kind, body, linkUrl }
          : {
              kind,
              address,
              pricePence: price ?? undefined,
              status,
              date: date || null,
              beds: beds === "" ? null : Number(beds),
              floorAreaSqm:
                sqft === ""
                  ? null
                  : Number(sqft.replace(/,/g, "")) / SQFT_PER_SQM,
              body,
              linkUrl,
            }
      const result = note
        ? await updateDealNote(note.id, input)
        : await addDealNote(dealId, input)
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.message)
        return
      }
      if (note) onDone?.()
      else {
        reset()
        toast.success(kind === "note" ? "Note added" : "Comparable added")
        onAdded?.()
      }
    })

  // Unique per form: the panel, the sheet and edit forms can all be on the page.
  const formId = useId()
  const idFor = (name: string) => `note${formId}${name}`
  const field = (
    name: string,
    label: string,
    control: ReactNode,
    className?: string
  ) => (
    <FormField
      id={idFor(name)}
      label={label}
      error={errors[name]}
      className={className}
    >
      {control}
    </FormField>
  )

  return (
    <form
      aria-label={note ? "Edit note" : "Add a note"}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <FieldGroup className="gap-3">

        {kind === "comparable" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {field(
              "address",
              "Address",
              <Input
                id={idFor("address")}
                value={address}
                aria-invalid={!!errors.address}
                placeholder="12 Example Road"
                onChange={(e) => setAddress(e.target.value)}
              />,
              "sm:col-span-2"
            )}
            {field(
              "pricePence",
              "Price",
              <MoneyInput
                id={idFor("pricePence")}
                value={price}
                aria-invalid={!!errors.pricePence}
                onValueChange={setPrice}
              />
            )}
            <FormField id={idFor("status")} label="Sold or for sale?">
              <ToggleGroup
                id={idFor("status")}
                variant="outline"
                size="sm"
                value={[status]}
                onValueChange={(v: string[]) =>
                  v[0] && setStatus(v[0] as CompStatus)
                }
              >
                <ToggleGroupItem value="sold">Sold</ToggleGroupItem>
                <ToggleGroupItem value="listed">For sale</ToggleGroupItem>
              </ToggleGroup>
            </FormField>
            {field(
              "date",
              status === "sold" ? "Date sold" : "Date listed",
              <Input
                id={idFor("date")}
                type="date"
                value={date}
                aria-invalid={!!errors.date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              {field(
                "beds",
                "Beds",
                <Input
                  id={idFor("beds")}
                  inputMode="numeric"
                  value={beds}
                  aria-invalid={!!errors.beds}
                  onChange={(e) => setBeds(e.target.value.replace(/\D/g, ""))}
                />
              )}
              {field(
                "floorAreaSqm",
                "Sq ft",
                <Input
                  id={idFor("floorAreaSqm")}
                  inputMode="numeric"
                  value={sqft}
                  aria-invalid={!!errors.floorAreaSqm}
                  onChange={(e) =>
                    setSqft(e.target.value.replace(/[^\d,]/g, ""))
                  }
                />
              )}
            </div>
          </div>
        ) : null}

        {field(
          "body",
          kind === "note" ? "Note" : "Notes (optional)",
          <Textarea
            id={idFor("body")}
            value={body}
            rows={kind === "note" && !compact ? 3 : 2}
            aria-invalid={!!errors.body}
            placeholder={
              kind === "note"
                ? "What did you find? Details from the agent, questions, things to check…"
                : "Condition, how it compares, anything worth knowing"
            }
            onChange={(e) => setBody(e.target.value)}
          />
        )}
        {field(
          "linkUrl",
          "Link (optional)",
          <Input
            id={idFor("linkUrl")}
            type="url"
            inputMode="url"
            value={linkUrl}
            aria-invalid={!!errors.linkUrl}
            placeholder="https://"
            onChange={(e) => setLinkUrl(e.target.value)}
          />
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            {note ? "Save" : kind === "note" ? "Add note" : "Add comparable"}
          </Button>
          {note ? (
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancel
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  )
}
