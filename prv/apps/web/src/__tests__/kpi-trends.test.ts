import { describe, it, expect } from "vitest"
import { pctChange, buildKpiTrends, HEADLINE_METRICS, type MetricDef } from "@/lib/kpi-trends"

describe("pctChange", () => {
  it("computes signed percentage rounded to 0.1", () => {
    expect(pctChange(110, 100)).toBe(10)
    expect(pctChange(90, 100)).toBe(-10)
    expect(pctChange(133, 100)).toBe(33)
  })
  it("handles a zero previous value", () => {
    expect(pctChange(0, 0)).toBe(0)
    expect(pctChange(5, 0)).toBe(100)
    expect(pctChange(-5, 0)).toBe(-100)
  })
  it("uses the magnitude of previous for negatives", () => {
    expect(pctChange(-50, -100)).toBe(50) // improved from -100 to -50
  })
})

describe("buildKpiTrends", () => {
  const rows = [
    { revenueMonth: "100", overdueAmount: "50", headcount: 10 },
    { revenueMonth: "110", overdueAmount: "45", headcount: 10 },
    { revenueMonth: "130", overdueAmount: "40", headcount: 10 },
  ]
  const metrics: MetricDef[] = [
    { key: "revenueMonth", label: "Revenue", format: "currency" },
    { key: "overdueAmount", label: "Overdue", format: "currency", goodWhen: "down" },
    { key: "headcount", label: "Headcount", format: "number" },
  ]

  it("takes current from the newest row and previous from the oldest", () => {
    const [rev] = buildKpiTrends(rows, metrics)
    expect(rev!.current).toBe(130)
    expect(rev!.previous).toBe(100)
    expect(rev!.deltaPct).toBe(30)
    expect(rev!.direction).toBe("up")
    expect(rev!.positive).toBe(true)
    expect(rev!.sparkline).toEqual([100, 110, 130])
  })

  it("marks a downward move favourable when goodWhen is down", () => {
    const overdue = buildKpiTrends(rows, metrics)[1]!
    expect(overdue.direction).toBe("down")
    expect(overdue.positive).toBe(true) // overdue falling is good
  })

  it("treats a flat series as neutral/positive", () => {
    const hc = buildKpiTrends(rows, metrics)[2]!
    expect(hc.direction).toBe("flat")
    expect(hc.deltaPct).toBe(0)
    expect(hc.positive).toBe(true)
  })

  it("handles an empty series", () => {
    const [rev] = buildKpiTrends([], metrics)
    expect(rev!.current).toBe(0)
    expect(rev!.sparkline).toEqual([])
  })

  it("exposes 8 headline metrics", () => {
    expect(HEADLINE_METRICS).toHaveLength(8)
    expect(HEADLINE_METRICS.find((m) => m.key === "overdueAmount")!.goodWhen).toBe("down")
  })
})
