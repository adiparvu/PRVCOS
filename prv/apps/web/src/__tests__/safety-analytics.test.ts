import { describe, it, expect } from "vitest"
import { computeSafetyAnalytics } from "@/lib/safety-analytics"

const base = {
  type: "accident",
  status: "open" as const,
  injuriesCount: 0,
  incidentAt: "2026-01-01T00:00:00.000Z",
  closedAt: null,
}

describe("computeSafetyAnalytics", () => {
  it("counts totals, open incidents, injuries and severity mix", () => {
    const a = computeSafetyAnalytics([
      { ...base, severity: "low", injuriesCount: 0 },
      { ...base, severity: "high", status: "under_investigation", injuriesCount: 2 },
      {
        ...base,
        severity: "critical",
        status: "resolved",
        closedAt: "2026-01-03T00:00:00.000Z",
        injuriesCount: 1,
      },
    ])
    expect(a.total).toBe(3)
    expect(a.open).toBe(2) // low(open) + high(under_investigation)
    expect(a.injuriesTotal).toBe(3)
    expect(a.bySeverity).toEqual({ low: 1, medium: 0, high: 1, critical: 1 })
  })

  it("weights only open incidents into the risk index", () => {
    const a = computeSafetyAnalytics([
      { ...base, severity: "high", status: "open" }, // ×7
      { ...base, severity: "medium", status: "open" }, // ×3
      { ...base, severity: "critical", status: "closed", closedAt: "2026-01-02T00:00:00.000Z" }, // resolved → not counted
    ])
    expect(a.riskIndex).toBe(10)
    expect(a.riskBand).toBe("elevated") // open high, no open critical
  })

  it("flags critical band when an open critical incident exists", () => {
    const a = computeSafetyAnalytics([{ ...base, severity: "critical", status: "open" }])
    expect(a.riskBand).toBe("critical")
    expect(a.riskIndex).toBe(15)
  })

  it("reports stable when nothing is open", () => {
    const a = computeSafetyAnalytics([
      { ...base, severity: "high", status: "resolved", closedAt: "2026-01-05T00:00:00.000Z" },
    ])
    expect(a.riskBand).toBe("stable")
    expect(a.open).toBe(0)
    expect(a.riskIndex).toBe(0)
  })

  it("ranks the type breakdown by count desc", () => {
    const a = computeSafetyAnalytics([
      { ...base, severity: "low", type: "near_miss" },
      { ...base, severity: "low", type: "near_miss" },
      { ...base, severity: "low", type: "hazard" },
    ])
    expect(a.byType).toEqual([
      { type: "near_miss", count: 2 },
      { type: "hazard", count: 1 },
    ])
  })

  it("computes resolution rate and mean time to resolve over closed incidents", () => {
    const a = computeSafetyAnalytics([
      {
        ...base,
        severity: "low",
        status: "resolved",
        incidentAt: "2026-01-01T00:00:00.000Z",
        closedAt: "2026-01-05T00:00:00.000Z",
      }, // 4d
      {
        ...base,
        severity: "low",
        status: "closed",
        incidentAt: "2026-01-01T00:00:00.000Z",
        closedAt: "2026-01-07T00:00:00.000Z",
      }, // 6d
      { ...base, severity: "low", status: "open" },
    ])
    expect(a.resolvedCount).toBe(2)
    expect(a.resolutionRate).toBe(66.7)
    expect(a.mttrDays).toBe(5)
  })

  it("returns null MTTR and zero rate for an empty incident set", () => {
    const a = computeSafetyAnalytics([])
    expect(a.total).toBe(0)
    expect(a.mttrDays).toBeNull()
    expect(a.resolutionRate).toBe(0)
    expect(a.riskBand).toBe("stable")
  })
})
