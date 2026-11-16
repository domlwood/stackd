import type { SupabaseClient } from "@supabase/supabase-js"

import { inputDef, refurbItemCostKey } from "@/lib/inputs/registry"
import type { Database, Json } from "@/lib/supabase/database.types"

type Admin = SupabaseClient<Database>
type Status = "lead" | "analysing" | "viewing" | "offer" | "accepted" | "passed"

type SeedInput = { key: string; value: unknown; source?: string; by: "a" | "b" }
type SeedDeal = {
  deal: {
    address_line: string
    postcode: string
    status: Status
    passed_reason?: string
    property_type: string
    tenure: string
    beds: number
    baths: number
    floor_area_sqm: number | null
    asking_price_pence: number
    agent: string
    description: string
  }
  purchaseProduct: string | null
  refiProduct: string | null
  inputs: SeedInput[]
  refurb: {
    category: string
    description: string
    costPence: number
    source?: string
  }[]
}

const BRIDGE = "Example Bridging Ltd · Light refurb bridge"
const BTL = "Example BTL Lender · 5-year fix, Ltd company"
const RESI = "Example Building Society · 2-year fix, 75% LTV"
const CASH = "Own funds · Cash purchase"

export const SAMPLE_DEALS: SeedDeal[] = [
  {
    deal: {
      address_line: "14 Victoria Road, Leeds",
      postcode: "LS6 1AB",
      status: "analysing",
      property_type: "terraced",
      tenure: "freehold",
      beds: 3,
      baths: 1,
      floor_area_sqm: 85,
      asking_price_pence: 16_500_000,
      agent: "Example Estates Leeds",
      description:
        "Three-bed through terrace needing full modernisation. Close to the university.",
    },
    purchaseProduct: BRIDGE,
    refiProduct: BTL,
    inputs: [
      {
        key: "purchase.price",
        value: 15_500_000,
        source: "Agent says vendor would take £155k",
        by: "a",
      },
      {
        key: "exit.gdv",
        value: 23_000_000,
        source: "No. 6 sold £228k Mar 2026 (Land Registry)",
        by: "a",
      },
      {
        key: "keep.rentMonthly",
        value: 115_000,
        source: "Two letting agents' valuations",
        by: "b",
      },
      { key: "refurb.months", value: 3, by: "a" },
    ],
    refurb: [
      {
        category: "Kitchen",
        description: "New kitchen and appliances",
        costPence: 900_000,
        source: "Builder estimate",
      },
      {
        category: "Bathroom",
        description: "Full bathroom",
        costPence: 500_000,
      },
      {
        category: "Electrics",
        description: "Rewire + consumer unit",
        costPence: 450_000,
        source: "Electrician quote",
      },
      {
        category: "Plastering & decorating",
        description: "Skim and paint throughout",
        costPence: 600_000,
      },
    ],
  },
  {
    deal: {
      address_line: "Flat 3, 27 Harbour Street, Hull",
      postcode: "HU1 2AA",
      status: "lead",
      property_type: "flat",
      tenure: "leasehold",
      beds: 2,
      baths: 1,
      floor_area_sqm: 62,
      asking_price_pence: 8_500_000,
      agent: "Example Lettings & Sales",
      description:
        "Second-floor flat in a converted warehouse. 98 years on the lease.",
    },
    purchaseProduct: CASH,
    refiProduct: BTL,
    inputs: [
      { key: "purchase.price", value: 8_000_000, by: "b" },
      {
        key: "exit.gdv",
        value: 11_000_000,
        source: "Similar flats in the block sold £105k–£112k",
        by: "b",
      },
      { key: "keep.rentMonthly", value: 65_000, by: "b" },
      {
        key: "keep.groundRentServiceMonthly",
        value: 12_000,
        source: "Service charge £1,440/yr per listing",
        by: "b",
      },
      { key: "refurb.months", value: 2, by: "b" },
    ],
    refurb: [
      {
        category: "Kitchen",
        description: "Refresh doors and worktops",
        costPence: 350_000,
      },
      { category: "Flooring", description: "Throughout", costPence: 250_000 },
      {
        category: "Plastering & decorating",
        description: "Paint throughout",
        costPence: 200_000,
      },
    ],
  },
  {
    deal: {
      address_line: "8 Elm Grove, Sheffield",
      postcode: "S7 1CD",
      status: "offer",
      property_type: "semi_detached",
      tenure: "freehold",
      beds: 3,
      baths: 1,
      floor_area_sqm: 95,
      asking_price_pence: 21_000_000,
      agent: "Example Homes Sheffield",
      description:
        "Probate sale. Dated throughout, good-sized garden, off-road parking.",
    },
    purchaseProduct: BRIDGE,
    refiProduct: BTL,
    inputs: [
      {
        key: "purchase.price",
        value: 20_000_000,
        source: "Our offer, submitted to agent",
        by: "a",
      },
      {
        key: "exit.gdv",
        value: 29_000_000,
        source: "3 renovated semis on Elm Grove sold £285k–£300k",
        by: "a",
      },
      { key: "keep.rentMonthly", value: 140_000, by: "a" },
      { key: "refurb.months", value: 4, by: "a" },
    ],
    refurb: [
      {
        category: "Kitchen",
        description: "Knock through to dining, new kitchen",
        costPence: 1_400_000,
        source: "Builder quote",
      },
      { category: "Bathroom", description: "New bathroom", costPence: 600_000 },
      {
        category: "Plumbing & heating",
        description: "New boiler and radiators",
        costPence: 550_000,
      },
      {
        category: "Windows & doors",
        description: "Replace front windows",
        costPence: 300_000,
      },
      {
        category: "Plastering & decorating",
        description: "Throughout",
        costPence: 650_000,
      },
    ],
  },
  {
    deal: {
      address_line: "22 Mill Lane, Doncaster",
      postcode: "DN4 5EF",
      status: "passed",
      passed_reason:
        "Structural survey flagged subsidence; repair costs too uncertain to price.",
      property_type: "terraced",
      tenure: "freehold",
      beds: 2,
      baths: 1,
      floor_area_sqm: 70,
      asking_price_pence: 12_000_000,
      agent: "Example Property Doncaster",
      description: "Two-bed mid terrace, previously let.",
    },
    purchaseProduct: RESI,
    refiProduct: BTL,
    inputs: [
      { key: "purchase.price", value: 12_000_000, by: "b" },
      { key: "exit.gdv", value: 13_500_000, by: "b" },
      { key: "keep.rentMonthly", value: 75_000, by: "b" },
    ],
    refurb: [
      {
        category: "Structural",
        description: "Underpinning (rough guess)",
        costPence: 1_500_000,
        source: "Surveyor's ballpark",
      },
    ],
  },
]

export async function seedDeals(
  admin: Admin,
  workspaceId: string,
  users: { a: string; b: string }
) {
  const { data: products, error: productError } = await admin
    .from("finance_product")
    .select("id, lender, name")
    .eq("workspace_id", workspaceId)
  if (productError) throw productError
  const productId = (label: string | null) =>
    label
      ? (products.find((p) => `${p.lender} · ${p.name}` === label)?.id ?? null)
      : null

  for (const sample of SAMPLE_DEALS) {
    const { data: existing } = await admin
      .from("deal")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("address_line", sample.deal.address_line)
      .maybeSingle()
    if (existing) continue

    const { data: deal, error } = await admin
      .from("deal")
      .insert({
        ...sample.deal,
        workspace_id: workspaceId,
        created_by: users.a,
      })
      .select("id")
      .single()
    if (error) throw error

    const inputs: SeedInput[] = [
      ...sample.inputs,
      {
        key: "purchaseFinance.product",
        value: productId(sample.purchaseProduct),
        by: "a",
      },
      { key: "keep.product", value: productId(sample.refiProduct), by: "a" },
    ]

    for (const [ordinal, line] of sample.refurb.entries()) {
      const { data: item, error: itemError } = await admin
        .from("refurb_item")
        .insert({
          workspace_id: workspaceId,
          deal_id: deal.id,
          category: line.category,
          description: line.description,
          ordinal,
          created_by: users.a,
        })
        .select("id")
        .single()
      if (itemError) throw itemError
      inputs.push({
        key: refurbItemCostKey(item.id),
        value: line.costPence,
        source: line.source,
        by: "a",
      })
    }

    const rows = inputs.map((input) => {
      const def = inputDef(input.key)
      if (!def || !def.schema.safeParse(input.value).success)
        throw new Error(`Invalid seed input ${input.key}`)
      return {
        workspace_id: workspaceId,
        deal_id: deal.id,
        key: input.key,
        scope: "agreed",
        user_id: null,
        value: input.value as Json,
        source_text: input.source ?? null,
        set_by: users[input.by],
      }
    })
    const { error: inputError } = await admin.from("deal_input").insert(rows)
    if (inputError) throw inputError
    console.log(`✔ deal: ${sample.deal.address_line} (${sample.deal.status})`)
  }
}
