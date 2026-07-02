import { describe, it, expect } from "vitest"
import { computeHealth } from "@/lib/project-health"

describe("computeHealth", () => {
  it("blends budget, progress and risk into a banded 0–100 score", () => {
    const r = computeHealth({
      budgetBand: "green",
      taskCompletion: 0.5,
      totalTasks: 4,
      scheduleFraction: 0,
      openCriticalRisks: 1,
      openHighRisks: 0,
    })
    // budget 100, progress 100 (ahead of schedule), risk 70 → 0.35*100+0.35*100+0.3*70
    expect(r.breakdown).toEqual({ budget: 100, progress: 100, risk: 70 })
    expect(r.score).toBe(91)
    expect(r.band).toBe("healthy")
  })

  it("penalizes being behind schedule", () => {
    const r = computeHealth({
      budgetBand: "green",
      taskCompletion: 0.2,
      totalTasks: 10,
      scheduleFraction: 0.9,
      openCriticalRisks: 0,
      openHighRisks: 0,
    })
    // progress = 100 - (0.9-0.2)*140 = 2
    expect(r.breakdown.progress).toBe(2)
  })

  it("treats a project with no budget or tasks as neutral, not zero", () => {
    const r = computeHealth({
      budgetBand: null,
      taskCompletion: 0,
      totalTasks: 0,
      scheduleFraction: 0.5,
      openCriticalRisks: 0,
      openHighRisks: 0,
    })
    expect(r.breakdown.budget).toBe(75)
    expect(r.breakdown.progress).toBe(75)
    expect(r.breakdown.risk).toBe(100)
  })

  it("drops to critical band under heavy risk and red budget", () => {
    const r = computeHealth({
      budgetBand: "red",
      taskCompletion: 0.1,
      totalTasks: 5,
      scheduleFraction: 0.8,
      openCriticalRisks: 2,
      openHighRisks: 1,
    })
    expect(r.band).toBe("critical")
    expect(r.score).toBeLessThan(50)
  })
})
