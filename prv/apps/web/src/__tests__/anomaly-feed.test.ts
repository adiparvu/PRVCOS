import { describe, it, expect } from "vitest"
import { detectAnomalies } from "@/lib/anomaly-feed"
import type { MetricDef } from "@/lib/kpi-trends"

const metrics: MetricDef[] = [
  { key: "revenueMonth", label: "Revenue", format: "currency" },
  { key: "overdueAmount", label: "Overdue", format: "currency", goodWhen: "down" },
  { key: "headcount", label: "Headcount", format: "number" },
]

describe("detectAnomalies", () => {
  it("flags moves at/above the thresholds and classifies severity", () => {
    const rows = [
      { revenueMonth: "100", overdueAmount: "8000", headcount: 100 },
      { revenueMonth: "130", overdueAmount: "18400", headcount: 105 }, // rev +30% warn, overdue +130% crit, hc +5% none
    ]
    const a = detectAnomalies(rows, metrics)
    expect(a).toHaveLength(2)
    // ordered most-severe first: overdue (critical) before revenue (warning)
    expect(a[0]!.key).toBe("overdueAmount")
    expect(a[0]!.severity).toBe("critical")
    expect(a[0]!.deltaPct).toBe(130)
    expect(a[0]!.favourable).toBe(false) // overdue up is bad
    expect(a[1]!.key).toBe("revenueMonth")
    expect(a[1]!.severity).toBe("warning")
  })

  it("marks a big favourable move as favourable, not alarming", () => {
    const rows = [
      { revenueMonth: "100", overdueAmount: "30000", headcount: 100 },
      { revenueMonth: "100", overdueAmount: "20000", headcount: 100 }, // overdue -33%
    ]
    const a = detectAnomalies(rows, metrics)
    expect(a).toHaveLength(1)
    expect(a[0]!.key).toBe("overdueAmount")
    expect(a[0]!.direction).toBe("down")
    expect(a[0]!.favourable).toBe(true)
  })

  it("respects custom thresholds", () => {
    const rows = [
      { revenueMonth: "100", overdueAmount: "100", headcount: 100 },
      { revenueMonth: "115", overdueAmount: "100", headcount: 100 }, // +15%
    ]
    expect(detectAnomalies(rows, metrics)).toHaveLength(0) // below default 25
    expect(detectAnomalies(rows, metrics, { warnPct: 10 })).toHaveLength(1)
  })

  it("returns nothing with fewer than two snapshots", () => {
    expect(detectAnomalies([], metrics)).toEqual([])
    expect(detectAnomalies([{ revenueMonth: "100" }], metrics)).toEqual([])
  })
})
