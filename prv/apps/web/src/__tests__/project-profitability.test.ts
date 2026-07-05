import { describe, it, expect } from "vitest"
import { computeProfitability } from "@/lib/project-profitability"

describe("computeProfitability", () => {
  it("computes per-project profit, margin, budget usage and bands", () => {
    const pf = computeProfitability([
      { id: "a", name: "A", revenue: 142000, cost: 96000, budget: 120000 },
      { id: "b", name: "B", revenue: 90000, cost: 84000, budget: 88000 }, // 6.7% thin
      { id: "c", name: "C", revenue: 60000, cost: 76000, budget: 70000 }, // loss
    ])
    const byId = Object.fromEntries(pf.projects.map((p) => [p.id, p]))
    expect(byId.a!.profit).toBe(46000)
    expect(byId.a!.marginPct).toBe(32.4)
    expect(byId.a!.budgetUsedPct).toBe(80)
    expect(byId.a!.band).toBe("profitable")
    expect(byId.b!.band).toBe("thin")
    expect(byId.c!.profit).toBe(-16000)
    expect(byId.c!.band).toBe("loss")
  })

  it("ranks by profit descending", () => {
    const pf = computeProfitability([
      { id: "low", name: "Low", revenue: 100, cost: 90, budget: 100 },
      { id: "high", name: "High", revenue: 1000, cost: 100, budget: 1000 },
    ])
    expect(pf.projects.map((p) => p.id)).toEqual(["high", "low"])
  })

  it("rolls up the portfolio totals + margin", () => {
    const pf = computeProfitability([
      { id: "a", name: "A", revenue: 300, cost: 200, budget: 300 },
      { id: "b", name: "B", revenue: 200, cost: 250, budget: 200 },
    ])
    expect(pf.totalRevenue).toBe(500)
    expect(pf.totalCost).toBe(450)
    expect(pf.totalProfit).toBe(50)
    expect(pf.marginPct).toBe(10)
    expect(pf.profitableCount).toBe(1)
    expect(pf.lossCount).toBe(1)
  })

  it("handles a project with no revenue without dividing by zero", () => {
    const pf = computeProfitability([{ id: "a", name: "A", revenue: 0, cost: 5000, budget: 10000 }])
    expect(pf.projects[0]!.marginPct).toBe(0)
    expect(pf.projects[0]!.profit).toBe(-5000)
    expect(pf.projects[0]!.band).toBe("loss")
    expect(pf.marginPct).toBe(0)
  })
})
