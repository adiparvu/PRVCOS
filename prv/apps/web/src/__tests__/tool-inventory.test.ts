import { describe, it, expect } from "vitest"
import { computeToolInventory } from "@/lib/tool-inventory"

const NOW = Date.parse("2026-07-06T00:00:00.000Z")
const inDays = (d: number) => new Date(NOW + d * 86_400_000).toISOString()

function tool(
  status: "available" | "in_use" | "maintenance" | "retired" | "lost",
  category: string | null = "Power",
  warrantyExpiresAt: string | null = null
) {
  return { status, category, warrantyExpiresAt }
}

describe("computeToolInventory", () => {
  it("returns zeros and null utilization for an empty register", () => {
    const inv = computeToolInventory([], NOW)
    expect(inv.total).toBe(0)
    expect(inv.utilizationPct).toBeNull()
    expect(inv.byCategory).toEqual([])
  })

  it("counts the status mix", () => {
    const inv = computeToolInventory(
      [
        tool("available"),
        tool("in_use"),
        tool("in_use"),
        tool("maintenance"),
        tool("lost"),
        tool("retired"),
      ],
      NOW
    )
    expect(inv.available).toBe(1)
    expect(inv.inUse).toBe(2)
    expect(inv.maintenance).toBe(1)
    expect(inv.lost).toBe(1)
    expect(inv.retired).toBe(1)
    expect(inv.total).toBe(6)
  })

  it("computes utilization over operable tools only", () => {
    // operable = available(2) + in_use(3) = 5; utilization = 3/5 = 60%
    const inv = computeToolInventory(
      [
        tool("available"),
        tool("available"),
        tool("in_use"),
        tool("in_use"),
        tool("in_use"),
        tool("maintenance"),
        tool("lost"),
      ],
      NOW
    )
    expect(inv.operable).toBe(5)
    expect(inv.utilizationPct).toBe(60)
  })

  it("counts warranty exposure, ignoring retired/lost tools", () => {
    const inv = computeToolInventory(
      [
        tool("available", "Power", inDays(-5)), // expired
        tool("in_use", "Power", inDays(12)), // expiring
        tool("available", "Power", inDays(200)), // fine
        tool("lost", "Power", inDays(-1)), // ignored (lost)
      ],
      NOW
    )
    expect(inv.warrantyExpired).toBe(1)
    expect(inv.warrantyExpiring).toBe(1)
  })

  it("breaks tools down by category, largest first, with in-use counts", () => {
    const inv = computeToolInventory(
      [
        tool("in_use", "Power"),
        tool("available", "Power"),
        tool("available", "Power"),
        tool("in_use", "Hand"),
        tool("available", null),
      ],
      NOW
    )
    expect(inv.byCategory[0]).toEqual({ category: "Power", total: 3, inUse: 1 })
    expect(inv.byCategory.find((c) => c.category === "Uncategorised")!.total).toBe(1)
  })
})
