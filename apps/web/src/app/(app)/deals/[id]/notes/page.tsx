import type { Metadata } from "next"
import type { Route } from "next"
import Link from "next/link"
import { HistoryIcon } from "lucide-react"

import { NotesView } from "@/features/notes/components/notes-view"
import { listDealNotes } from "@/features/notes/queries"

export const metadata: Metadata = { title: "Notes" }

/** All notes and comparables (phones and tablets; wide screens use the panel). */
export default async function DealNotesPage({
  params,
}: PageProps<"/deals/[id]/notes">) {
  const { id } = await params
  const notes = await listDealNotes(id)
  return (
    <div className="flex flex-col gap-4">
      <NotesView notes={notes} />
      <Link
        href={`/deals/${id}/activity` as Route}
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <HistoryIcon className="size-4" aria-hidden />
        Everything that&apos;s changed on this deal
      </Link>
    </div>
  )
}
