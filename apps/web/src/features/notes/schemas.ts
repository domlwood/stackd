import { z } from "zod"

export const COMP_STATUSES = ["sold", "listed"] as const
export type CompStatus = (typeof COMP_STATUSES)[number]
export const COMP_STATUS_LABELS: Record<CompStatus, string> = {
  sold: "Sold",
  listed: "For sale",
}

const linkUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (v) => v === "" || /^https?:\/\/\S+$/i.test(v),
    "Paste a full link, starting https://"
  )
  .optional()
  .transform((v) => v || null)

/** A free-text note: details, agent calls, questions for each other. */
const noteSchema = z.object({
  kind: z.literal("note"),
  body: z.string().trim().min(1, "Write something first").max(5000),
  linkUrl,
})

/** A similar property sold or for sale nearby, as evidence for the end value. */
const comparableSchema = z.object({
  kind: z.literal("comparable"),
  address: z.string().trim().min(1, "Add the address").max(200),
  pricePence: z
    .number({ error: "Add the price" })
    .int()
    .min(100, "Add the price")
    .max(100_000_000_000),
  status: z.enum(COMP_STATUSES),
  date: z.iso.date().nullable().optional().default(null),
  beds: z.number().int().min(0).max(50).nullable().optional().default(null),
  floorAreaSqm: z
    .number()
    .positive()
    .max(100_000)
    .nullable()
    .optional()
    .default(null),
  body: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .transform((v) => v || null),
  linkUrl,
})

export const dealNoteInputSchema = z.discriminatedUnion("kind", [
  noteSchema,
  comparableSchema,
])
export type DealNoteInput = z.input<typeof dealNoteInputSchema>
export type DealNoteValues = z.output<typeof dealNoteInputSchema>
