import { describe, it, expect } from "vitest"
import { computeLearningCompletion } from "@/lib/learning-completion"

function enr(
  courseId: string,
  status: "new" | "in_progress" | "completed" | "saved",
  progressPct: number,
  courseTitle = `Course ${courseId}`
) {
  return { courseId, courseTitle, status, progressPct }
}

describe("computeLearningCompletion", () => {
  it("returns null rates for no enrollments", () => {
    const c = computeLearningCompletion([])
    expect(c.totalEnrollments).toBe(0)
    expect(c.completionRatePct).toBeNull()
    expect(c.avgProgressPct).toBeNull()
    expect(c.courses).toEqual([])
  })

  it("counts the status mix and overall completion rate", () => {
    const c = computeLearningCompletion([
      enr("a", "completed", 100),
      enr("a", "in_progress", 40),
      enr("a", "new", 0),
      enr("a", "completed", 100),
    ])
    expect(c.byStatus).toEqual({ new: 1, in_progress: 1, completed: 2, saved: 0 })
    expect(c.completionRatePct).toBe(50) // 2 of 4
    expect(c.avgProgressPct).toBe(60) // (100+40+0+100)/4
  })

  it("breaks completion down per course, largest enrolment first", () => {
    const c = computeLearningCompletion([
      enr("big", "completed", 100, "Onboarding"),
      enr("big", "in_progress", 50, "Onboarding"),
      enr("big", "completed", 100, "Onboarding"),
      enr("small", "new", 0, "Advanced"),
    ])
    expect(c.courses[0]!.courseId).toBe("big")
    expect(c.courses[0]!.enrolled).toBe(3)
    expect(c.courses[0]!.completed).toBe(2)
    expect(c.courses[0]!.completionRatePct).toBe(66.7)
    expect(c.courses[0]!.avgProgressPct).toBe(83.3) // (100+50+100)/3
  })

  it("clamps out-of-range progress values", () => {
    const c = computeLearningCompletion([
      enr("a", "in_progress", 140),
      enr("a", "in_progress", -20),
    ])
    expect(c.avgProgressPct).toBe(50) // (100 + 0) / 2
  })
})
