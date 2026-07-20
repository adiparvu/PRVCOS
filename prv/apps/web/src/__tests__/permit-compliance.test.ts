import { describe, it, expect } from "vitest"
import { computePermitCompliance } from "@/lib/permit-compliance"

const base = {
  total: 20,
  draft: 2,
  pendingApproval: 3,
  approved: 1,
  active: 5,
  closed: 6,
  rejected: 1,
  expired: 1,
  suspended: 0,
  revoked: 1,
  activeExpired: 2,
}

describe("computePermitCompliance", () => {
  it("computes terminated, close-out rate, and live-valid", () => {
    const c = computePermitCompliance(base)
    expect(c.terminated).toBe(8) // 6 closed + 1 expired + 1 revoked
    expect(c.complianceRate).toBe(75) // 6/8
    expect(c.liveValid).toBe(3) // 5 active - 2 past-window
    expect(c.atRisk).toBe(2)
  })
  it("is 100% compliant when nothing has terminated", () => {
    const c = computePermitCompliance({
      ...base,
      closed: 0,
      expired: 0,
      revoked: 0,
    })
    expect(c.terminated).toBe(0)
    expect(c.complianceRate).toBe(100)
  })
  it("never returns negative live-valid", () => {
    const c = computePermitCompliance({ ...base, active: 1, activeExpired: 3 })
    expect(c.liveValid).toBe(0)
  })
})
