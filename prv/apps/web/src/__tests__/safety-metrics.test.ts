import { describe, it, expect } from "vitest"
import { computeSafetyMetrics } from "@/lib/safety-metrics"

const NOW = Date.parse("2026-07-06T00:00:00.000Z")
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

function inc(type: string, days: number, location: string | null = null) {
  return { type, incidentAt: daysAgo(days), location }
}

describe("computeSafetyMetrics", () => {
  it("returns safe defaults for an empty log", () => {
    const m = computeSafetyMetrics([], NOW)
    expect(m.total).toBe(0)
    expect(m.daysSinceLastIncident).toBeNull()
    expect(m.nearMissRatioPct).toBeNull()
    expect(m.highRiskLocation).toBeNull()
  })

  it("computes days since the last recordable incident", () => {
    const m = computeSafetyMetrics([inc("accident", 12), inc("accident", 40)], NOW)
    expect(m.daysSinceLastIncident).toBe(12)
  })

  it("does not let a near-miss or hazard reset the incident streak", () => {
    // most recent event is a near-miss 2 days ago; last recordable is 30 days ago
    const m = computeSafetyMetrics([inc("near_miss", 2), inc("accident", 30)], NOW)
    expect(m.daysSinceLastIncident).toBe(30)
    expect(m.recordable).toBe(1)
    expect(m.nearMiss).toBe(1)
  })

  it("counts incidents in the trailing 30-day window", () => {
    const m = computeSafetyMetrics(
      [inc("accident", 5), inc("accident", 29), inc("accident", 45)],
      NOW
    )
    expect(m.incidentsLast30).toBe(2)
  })

  it("computes the near-miss ratio over reported incidents", () => {
    // 3 near-miss + 1 recordable = 4 reported → 75%
    const m = computeSafetyMetrics(
      [inc("near_miss", 1), inc("near_miss", 2), inc("near_miss", 3), inc("accident", 4)],
      NOW
    )
    expect(m.nearMissRatioPct).toBe(75)
  })

  it("ranks high-risk locations by recordable incident density", () => {
    const m = computeSafetyMetrics(
      [
        inc("accident", 1, "Site B"),
        inc("accident", 2, "Site B"),
        inc("property_damage", 3, "Site A"),
        inc("near_miss", 4, "Site C"), // near-miss excluded from location density
      ],
      NOW
    )
    expect(m.byLocation).toEqual([
      { location: "Site B", count: 2 },
      { location: "Site A", count: 1 },
    ])
    expect(m.highRiskLocation).toBe("Site B")
  })

  it("buckets missing locations under Unspecified", () => {
    const m = computeSafetyMetrics([inc("accident", 1, null), inc("accident", 2, "  ")], NOW)
    expect(m.byLocation).toEqual([{ location: "Unspecified", count: 2 }])
  })
})
