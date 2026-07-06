import { describe, it, expect } from "vitest"
import { computeIncidentTrend } from "@/lib/incident-trend"

const NOW = Date.parse("2026-07-15T00:00:00.000Z")

function inc(type: string, iso: string) {
  return { type, incidentAt: iso }
}

describe("computeIncidentTrend", () => {
  it("builds the requested number of month buckets ending at the current month", () => {
    const t = computeIncidentTrend([], NOW, 6)
    expect(t.months).toHaveLength(6)
    expect(t.months[5]!.month).toBe("2026-07")
    expect(t.months[5]!.label).toBe("Jul")
    expect(t.months[0]!.month).toBe("2026-02")
    expect(t.momChangePct).toBeNull()
  })

  it("counts recordable incidents into the right month", () => {
    const t = computeIncidentTrend(
      [
        inc("accident", "2026-07-02T10:00:00Z"),
        inc("accident", "2026-07-20T10:00:00Z"),
        inc("property_damage", "2026-06-10T10:00:00Z"),
      ],
      NOW,
      6
    )
    expect(t.months[5]!.count).toBe(2) // July
    expect(t.months[4]!.count).toBe(1) // June
  })

  it("excludes near-misses and hazards from the trend", () => {
    const t = computeIncidentTrend(
      [inc("near_miss", "2026-07-02T10:00:00Z"), inc("hazard", "2026-07-03T10:00:00Z")],
      NOW,
      6
    )
    expect(t.months[5]!.count).toBe(0)
  })

  it("computes month-over-month change between the last two months", () => {
    const t = computeIncidentTrend(
      [
        inc("accident", "2026-06-01T10:00:00Z"),
        inc("accident", "2026-06-15T10:00:00Z"), // June = 2
        inc("accident", "2026-07-01T10:00:00Z"),
        inc("accident", "2026-07-02T10:00:00Z"),
        inc("accident", "2026-07-03T10:00:00Z"), // July = 3
      ],
      NOW,
      6
    )
    expect(t.momChangePct).toBe(50) // 2 → 3
  })

  it("returns null MoM when the previous month had no incidents", () => {
    const t = computeIncidentTrend([inc("accident", "2026-07-01T10:00:00Z")], NOW, 6)
    expect(t.momChangePct).toBeNull()
  })

  it("ignores incidents outside the window", () => {
    const t = computeIncidentTrend([inc("accident", "2025-01-01T10:00:00Z")], NOW, 6)
    expect(t.months.every((m) => m.count === 0)).toBe(true)
  })
})
