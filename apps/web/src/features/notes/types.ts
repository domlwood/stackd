import type { CompStatus } from "./schemas"

export type Comparable = {
  address: string
  pricePence: number
  status: CompStatus
  /** Sold date, or when it was listed. */
  date: string | null
  beds: number | null
  floorAreaSqm: number | null
}

export type DealNote = {
  id: string
  dealId: string
  kind: "note" | "comparable"
  body: string | null
  linkUrl: string | null
  comp: Comparable | null
  pinned: boolean
  authorId: string | null
  createdAt: string
  updatedAt: string
}
