import { describe, it, expect } from "vitest"
import { computeTrainingCompliance } from "@/lib/training-compliance"

const NOW = Date.parse("2026-07-06T00:00:00.000Z")
const inDays = (d: number) => new Date(NOW + d * 86_400_000).toISOString()

function rec(id: string, days: number | null, name = "First Aid") {
  return {
    id,
    userName: `User ${id}`,
    trainingName: name,
    provider: "RedCross",
    expiresAt: days === null ? null : inDays(days),
  }
}

describe("computeTrainingCompliance", () => {
  it("returns null rate for an empty register", () => {
    const c = computeTrainingCompliance([], NOW)
    expect(c.total).toBe(0)
    expect(c.complianceRatePct).toBeNull()
  })

  it("bands each certificate by days until expiry", () => {
    const c = computeTrainingCompliance(
      [rec("exp", -3), rec("crit", 5), rec("warn", 20), rec("notice", 50), rec("valid", 200)],
      NOW
    )
    const byId = Object.fromEntries(c.records.map((r) => [r.id, r.status]))
    expect(byId.exp).toBe("expired")
    expect(byId.crit).toBe("critical")
    expect(byId.warn).toBe("warning")
    expect(byId.notice).toBe("notice")
    expect(byId.valid).toBe("valid")
  })

  it("treats records without an expiry date as non-expiring and valid", () => {
    const c = computeTrainingCompliance([rec("a", null)], NOW)
    expect(c.records[0]!.daysUntilExpiry).toBeNull()
    expect(c.records[0]!.status).toBe("valid")
  })

  it("computes compliance rate as non-expired over total", () => {
    const c = computeTrainingCompliance(
      [rec("a", -1), rec("b", 100), rec("c", 100), rec("d", 100)],
      NOW
    )
    expect(c.expired).toBe(1)
    expect(c.complianceRatePct).toBe(75) // 3 of 4 not expired
  })

  it("counts expiring-soon within 60 days excluding already-expired", () => {
    const c = computeTrainingCompliance(
      [rec("a", -5), rec("b", 10), rec("c", 45), rec("d", 90)],
      NOW
    )
    expect(c.expiringSoon).toBe(2) // b(10) + c(45)
  })

  it("sorts most overdue first, then soonest to lapse", () => {
    const c = computeTrainingCompliance(
      [rec("v", 300), rec("soon", 3), rec("old", -20), rec("mid", 15)],
      NOW
    )
    expect(c.records.map((r) => r.id)).toEqual(["old", "soon", "mid", "v"])
  })
})
