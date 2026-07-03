import { describe, it, expect } from "vitest"
import {
  projectPL,
  breakEvenMonth,
  summarizeScenarios,
  SCENARIO_REVENUE_FACTOR,
  type ForecastInputs,
} from "@/lib/finance/forecast"

const base: ForecastInputs = {
  monthlyRevenueRunRate: 10_000,
  weightedPipelineTotal: 6_000,
  pipelineSpreadMonths: 3,
  monthlyExpenseRunRate: 8_000,
  openingCumulative: 0,
}

describe("projectPL", () => {
  it("adds spread pipeline revenue only within the spread window", () => {
    const months = projectPL(base, 6, "base")
    // M1..M3: 10000 + 6000/3 = 12000 revenue; M4..M6: 10000
    expect(months[0]!.revenue).toBe(12_000)
    expect(months[2]!.revenue).toBe(12_000)
    expect(months[3]!.revenue).toBe(10_000)
    expect(months[0]!.net).toBe(4_000) // 12000 - 8000
    expect(months[3]!.net).toBe(2_000) // 10000 - 8000
  })

  it("accumulates cumulative net across months", () => {
    const months = projectPL(base, 3, "base")
    expect(months[0]!.cumulativeNet).toBe(4_000)
    expect(months[1]!.cumulativeNet).toBe(8_000)
    expect(months[2]!.cumulativeNet).toBe(12_000)
  })

  it("applies the scenario factor to revenue but not expenses", () => {
    const opt = projectPL(base, 1, "optimistic")[0]!
    expect(opt.revenue).toBe(Math.round(12_000 * SCENARIO_REVENUE_FACTOR.optimistic * 100) / 100)
    expect(opt.expenses).toBe(8_000)
    const cons = projectPL(base, 1, "conservative")[0]!
    expect(cons.revenue).toBe(Math.round(12_000 * 0.85 * 100) / 100)
  })
})

describe("breakEvenMonth", () => {
  it("finds the first month cumulative net climbs to non-negative from the red", () => {
    const inp: ForecastInputs = {
      monthlyRevenueRunRate: 10_000,
      weightedPipelineTotal: 0,
      pipelineSpreadMonths: 3,
      monthlyExpenseRunRate: 8_000, // +2000/mo
      openingCumulative: -5_000, // -3000, -1000, +1000 → M3
    }
    expect(breakEvenMonth(projectPL(inp, 6, "base"))).toBe(3)
  })

  it("is month 1 when profitable from the start (opening at 0)", () => {
    expect(breakEvenMonth(projectPL(base, 3, "base"))).toBe(1)
  })

  it("returns null when it never recovers", () => {
    const inp: ForecastInputs = {
      monthlyRevenueRunRate: 1_000,
      weightedPipelineTotal: 0,
      pipelineSpreadMonths: 3,
      monthlyExpenseRunRate: 5_000,
      openingCumulative: -100,
    }
    expect(breakEvenMonth(projectPL(inp, 6, "base"))).toBeNull()
  })
})

describe("summarizeScenarios", () => {
  it("returns all three scenarios ordered with rising revenue", () => {
    const s = summarizeScenarios(base, 6)
    expect(s.map((x) => x.scenario)).toEqual(["conservative", "base", "optimistic"])
    expect(s[0]!.totalRevenue).toBeLessThan(s[1]!.totalRevenue)
    expect(s[1]!.totalRevenue).toBeLessThan(s[2]!.totalRevenue)
    // expenses identical across scenarios
    expect(s[0]!.totalExpenses).toBe(s[2]!.totalExpenses)
    expect(s[1]!.netProfit).toBe(Math.round((s[1]!.totalRevenue - s[1]!.totalExpenses) * 100) / 100)
  })
})
