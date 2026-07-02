import { describe, it, expect } from "vitest"
import { nextStage, stageProgress, cycleProgress } from "@/lib/review-workflow"

describe("review workflow", () => {
  it("advances stages and stops at sign-off", () => {
    expect(nextStage("self_review")).toBe("manager_review")
    expect(nextStage("manager_review")).toBe("hr_review")
    expect(nextStage("hr_review")).toBe("signed_off")
    expect(nextStage("signed_off")).toBeNull()
  })

  it("maps stage progress 0–100", () => {
    expect(stageProgress("self_review")).toBe(0)
    expect(stageProgress("manager_review")).toBe(33)
    expect(stageProgress("hr_review")).toBe(67)
    expect(stageProgress("signed_off")).toBe(100)
  })

  it("rolls a cycle up to average completion", () => {
    const p = cycleProgress(["signed_off", "hr_review", "self_review"])
    expect(p.total).toBe(3)
    expect(p.signedOff).toBe(1)
    expect(p.percent).toBe(Math.round((100 + 67 + 0) / 3)) // 56
  })
})
