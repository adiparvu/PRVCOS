import { describe, it, expect } from "vitest"
import { buildInsights, summarizeInsights, type InsightInput } from "@/lib/insights"

const clean: InsightInput = {
  healthScore: 85,
  projects: [],
  attendanceWatch: [],
  safety: { open: 0, riskBand: "stable", riskIndex: 0, injuries: 0 },
  anomalies: [],
  demand: [],
}

describe("buildInsights", () => {
  it("returns nothing when every signal is within threshold", () => {
    expect(buildInsights(clean)).toEqual([])
  })

  it("flags critical and attention-level company health", () => {
    expect(buildInsights({ ...clean, healthScore: 42 })[0]!.severity).toBe("critical")
    const warn = buildInsights({ ...clean, healthScore: 64 })[0]!
    expect(warn.severity).toBe("warning")
    expect(warn.title).toContain("64/100")
  })

  it("emits over-budget and loss-making project insights", () => {
    const ins = buildInsights({
      ...clean,
      projects: [
        { name: "Office", band: "loss", profit: -16000, marginPct: -17.8, budgetUsedPct: 108 },
      ],
    })
    const ids = ins.map((i) => i.id)
    expect(ids).toContain("project-overbudget-Office")
    expect(ids).toContain("project-loss-Office")
    expect(ins.find((i) => i.id === "project-overbudget-Office")!.title).toBe(
      "Office is 8% over budget"
    )
    expect(ins.find((i) => i.id === "project-loss-Office")!.detail).toBe(
      "Profit -€16.0k at -17.8% margin."
    )
  })

  it("flags an open critical safety posture with injuries", () => {
    const ins = buildInsights({
      ...clean,
      safety: { open: 6, riskBand: "critical", riskIndex: 44, injuries: 2 },
    })
    expect(ins[0]!.severity).toBe("critical")
    expect(ins[0]!.title).toBe("Safety: 6 open incidents, risk 44")
    expect(ins[0]!.detail).toContain("2 recorded injuries")
  })

  it("flags critical anomalies and stockout risks, but not warnings/healthy stock", () => {
    const ins = buildInsights({
      ...clean,
      anomalies: [
        { label: "Overdue AR", deltaPct: 18, severity: "critical", favourable: false },
        { label: "Revenue", deltaPct: -4, severity: "warning", favourable: false },
      ],
      demand: [
        { name: "Slab", band: "critical", daysOfCover: null, suggestedReorderQty: 64 },
        { name: "Tile", band: "healthy", daysOfCover: 60, suggestedReorderQty: 0 },
      ],
    })
    const ids = ins.map((i) => i.id)
    expect(ids).toContain("anomaly-Overdue AR")
    expect(ids).toContain("stockout-Slab")
    expect(ids).not.toContain("anomaly-Revenue")
    expect(ids).not.toContain("stockout-Tile")
    expect(ins.find((i) => i.id === "stockout-Slab")!.detail).toContain("Below reorder point")
  })

  it("flags only poor-band attendance, not watch-band", () => {
    const ins = buildInsights({
      ...clean,
      attendanceWatch: [
        { name: "Vlad", attendanceRate: 76, band: "poor" },
        { name: "Maria", attendanceRate: 89, band: "watch" },
      ],
    })
    const ids = ins.map((i) => i.id)
    expect(ids).toContain("attendance-Vlad")
    expect(ids).not.toContain("attendance-Maria")
  })

  it("orders critical insights ahead of warnings", () => {
    const ins = buildInsights({
      ...clean,
      healthScore: 64, // warning
      demand: [{ name: "Slab", band: "critical", daysOfCover: 3, suggestedReorderQty: 10 }],
    })
    expect(ins[0]!.severity).toBe("critical")
    expect(ins[ins.length - 1]!.severity).toBe("warning")
  })
})

describe("summarizeInsights", () => {
  it("counts totals by severity", () => {
    const ins = buildInsights({
      ...clean,
      healthScore: 40, // critical
      attendanceWatch: [{ name: "V", attendanceRate: 70, band: "poor" }], // warning
    })
    expect(summarizeInsights(ins)).toEqual({ total: 2, critical: 1, warning: 1 })
  })
})
