import { describe, it, expect } from "vitest"
import { computeInspectionCompliance } from "@/lib/inspection-compliance"

const NOW = Date.parse("2026-07-06T00:00:00.000Z")
const at = (days: number) => new Date(NOW + days * 86_400_000).toISOString()

function ins(
  status: "scheduled" | "in_progress" | "completed" | "overdue",
  schedDays: number,
  score: number | null = null,
  maxScore: number | null = null,
  completedAt: string | null = null
) {
  return { status, scheduledAt: at(schedDays), completedAt, score, maxScore }
}

describe("computeInspectionCompliance", () => {
  it("returns null rates for an empty set", () => {
    const c = computeInspectionCompliance([], NOW)
    expect(c.total).toBe(0)
    expect(c.complianceRatePct).toBeNull()
    expect(c.avgScorePct).toBeNull()
  })

  it("computes compliance over due inspections only", () => {
    // 3 completed, 1 overdue, 1 upcoming → compliance = 3/4 = 75%
    const c = computeInspectionCompliance(
      [
        ins("completed", -10),
        ins("completed", -8),
        ins("completed", -3),
        ins("overdue", -2),
        ins("scheduled", 5), // upcoming, excluded from rate
      ],
      NOW
    )
    expect(c.completed).toBe(3)
    expect(c.overdue).toBe(1)
    expect(c.upcoming).toBe(1)
    expect(c.complianceRatePct).toBe(75)
  })

  it("treats a past-due scheduled/in-progress inspection as overdue", () => {
    const c = computeInspectionCompliance(
      [ins("scheduled", -1), ins("in_progress", -5), ins("scheduled", 3)],
      NOW
    )
    expect(c.overdue).toBe(2)
    expect(c.upcoming).toBe(1)
  })

  it("averages the score percentage over scored completed inspections", () => {
    const c = computeInspectionCompliance(
      [
        ins("completed", -1, 8, 10), // 80%
        ins("completed", -2, 9, 10), // 90%
        ins("completed", -3, null, null), // unscored, excluded
      ],
      NOW
    )
    expect(c.avgScorePct).toBe(85)
  })

  it("ignores invalid score denominators", () => {
    const c = computeInspectionCompliance([ins("completed", -1, 5, 0)], NOW)
    expect(c.avgScorePct).toBeNull()
  })
})
