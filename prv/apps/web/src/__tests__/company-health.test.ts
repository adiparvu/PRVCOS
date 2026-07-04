import { describe, it, expect } from "vitest"
import { computeCompanyHealth, bandFor } from "@/lib/company-health"

describe("bandFor", () => {
  it("maps composite ranges to bands", () => {
    expect(bandFor(85)).toBe("excellent")
    expect(bandFor(80)).toBe("excellent")
    expect(bandFor(65)).toBe("healthy")
    expect(bandFor(45)).toBe("watch")
    expect(bandFor(20)).toBe("at_risk")
  })
})

describe("computeCompanyHealth", () => {
  it("computes bounded per-domain sub-scores and their average", () => {
    const h = computeCompanyHealth({
      revenueMonth: 100_000,
      grossProfit: 30_000, // 30% margin
      overdueAmount: 10_000, // AR health 90
      totalTasks: 200,
      doneTasks: 160, // 80
      headcount: 100,
      presentToday: 90, // 90
      pipelineValue: 300_000, // coverage target 300k → 100
      activeLeads: 40, // activity capped 100
    })
    const byKey = Object.fromEntries(h.domains.map((d) => [d.key, d.score]))
    expect(byKey.finance).toBe(Math.round(30 * 0.6 + 90 * 0.4)) // 54
    expect(byKey.projects).toBe(80)
    expect(byKey.people).toBe(90)
    expect(byKey.sales).toBe(100) // coverage 100*0.7 + activity 100*0.3
    expect(h.composite).toBe(Math.round((54 + 80 + 90 + 100) / 4)) // 81
    expect(h.band).toBe("excellent")
  })

  it("clamps sub-scores and never divides by zero", () => {
    const h = computeCompanyHealth({})
    // finance floors at 40 (AR health = 100 with no revenue), others 0 → composite 10
    expect(h.composite).toBe(10)
    expect(h.domains).toHaveLength(4)
    // finance AR health is 100 when there is no revenue → finance = 40
    expect(h.domains.find((d) => d.key === "finance")!.score).toBe(40)
  })

  it("caps margin and coverage at 100", () => {
    const h = computeCompanyHealth({
      revenueMonth: 100,
      grossProfit: 1000, // >100% margin → capped
      overdueAmount: 0,
      pipelineValue: 10_000_000, // huge coverage → capped
      activeLeads: 999,
    })
    const fin = h.domains.find((d) => d.key === "finance")!
    expect(fin.score).toBe(100) // 100*0.6 + 100*0.4
    expect(h.domains.find((d) => d.key === "sales")!.score).toBe(100)
  })
})
