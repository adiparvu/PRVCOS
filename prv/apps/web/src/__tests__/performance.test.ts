import { describe, it, expect } from "vitest"
import { computePerformance } from "@/lib/performance"

describe("computePerformance", () => {
  it("computes rates and a weighted composite over all metrics", () => {
    const r = computePerformance({
      scheduledDays: 5,
      presentDays: 5,
      onTimeDays: 4,
      totalTasks: 4,
      doneTasks: 3,
      rating: 5,
    })
    expect(r.attendanceRate).toBe(100)
    expect(r.punctualityRate).toBe(80)
    expect(r.taskCompletionRate).toBe(75)
    expect(r.ratingPct).toBe(100)
    // (0.3*100 + 0.2*80 + 0.3*75 + 0.2*100) / 1.0 = 88.5
    expect(r.composite).toBe(88.5)
  })

  it("renormalizes the composite when metrics are missing", () => {
    const r = computePerformance({
      scheduledDays: 5,
      presentDays: 4,
      onTimeDays: 4,
      totalTasks: 2,
      doneTasks: 1,
      rating: null,
    })
    expect(r.ratingPct).toBeNull()
    // weights present 0.8: (0.3*80 + 0.2*100 + 0.3*50) / 0.8 = 73.75 → 73.8
    expect(r.composite).toBe(73.8)
  })

  it("returns null rates when denominators are zero", () => {
    const r = computePerformance({
      scheduledDays: 0,
      presentDays: 0,
      onTimeDays: 0,
      totalTasks: 0,
      doneTasks: 0,
      rating: null,
    })
    expect(r.attendanceRate).toBeNull()
    expect(r.taskCompletionRate).toBeNull()
    expect(r.composite).toBeNull()
  })
})
