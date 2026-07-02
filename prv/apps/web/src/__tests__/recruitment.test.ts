import { describe, it, expect } from "vitest"
import { computeFunnel } from "@/lib/recruitment"

describe("computeFunnel", () => {
  it("counts stages and derives active / hired / rejected", () => {
    const f = computeFunnel(["sourcing", "screening", "interview", "hired", "hired", "rejected"])
    expect(f.total).toBe(6)
    expect(f.hired).toBe(2)
    expect(f.rejected).toBe(1)
    expect(f.active).toBe(3)
    expect(f.byStage.interview).toBe(1)
  })

  it("computes hire rate from concluded candidates", () => {
    expect(computeFunnel(["hired", "hired", "rejected"]).hireRate).toBe(67) // 2/3
    expect(computeFunnel(["sourcing", "interview"]).hireRate).toBeNull() // none concluded
  })
})
