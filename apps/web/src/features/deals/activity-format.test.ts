import { describeActivity } from "./activity-format"

describe("describeActivity", () => {
  it("describes input changes with formatted values", () => {
    expect(
      describeActivity({
        action: "update",
        entityType: "deal_input",
        field: "exit.gdv",
        oldValue: { value: 30_000_000 },
        newValue: { value: 31_000_000 },
      })
    ).toBe("changed End value (GDV): £300,000 → £310,000")
    expect(
      describeActivity({
        action: "create",
        entityType: "deal_input",
        field: "keep.voids",
        oldValue: null,
        newValue: { value: 0.08 },
      })
    ).toBe("set Voids to 8%")
    expect(
      describeActivity({
        action: "delete",
        entityType: "deal_input",
        field: "keep.voids",
        oldValue: { value: 0.08 },
        newValue: null,
      })
    ).toBe("reset Voids to its default")
  })
  it("describes status moves and hides noise", () => {
    expect(
      describeActivity({
        action: "update",
        entityType: "deal",
        field: "status",
        oldValue: "lead",
        newValue: "offer",
      })
    ).toBe("moved the deal: Lead → Offer")
    expect(
      describeActivity({
        action: "update",
        entityType: "deal",
        field: "status",
        oldValue: "active",
        newValue: "bought",
      })
    ).toBe("moved the deal: Active → Bought")
    expect(
      describeActivity({
        action: "update",
        entityType: "deal",
        field: "archived_at",
        oldValue: null,
        newValue: "2026-11-16T12:00:00Z",
      })
    ).toBe("archived the deal")
    expect(
      describeActivity({
        action: "update",
        entityType: "deal",
        field: "archived_at",
        oldValue: "2026-11-16T12:00:00Z",
        newValue: null,
      })
    ).toBe("restored the deal")
    expect(
      describeActivity({
        action: "update",
        entityType: "deal",
        field: "status_changed_at",
        oldValue: "a",
        newValue: "b",
      })
    ).toBeNull()
  })
  it("describes source-only edits", () => {
    expect(
      describeActivity({
        action: "update",
        entityType: "deal_input",
        field: "keep.rentMonthly",
        oldValue: { value: 100_000, source: null },
        newValue: { value: 100_000, source: "Agent" },
      })
    ).toBe("updated the source or note for Rent (monthly)")
  })
})
