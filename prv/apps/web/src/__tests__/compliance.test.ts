import { describe, it, expect } from "vitest"
import { complianceBand, isCompliant } from "@/lib/compliance"

describe("compliance band", () => {
  it("bands documents by expiry", () => {
    expect(complianceBand("2026-02-01", "2026-03-01")).toBe("expired")
    expect(complianceBand("2026-03-20", "2026-03-01")).toBe("expiring") // 19 days
    expect(complianceBand("2026-06-01", "2026-03-01")).toBe("valid")
    expect(complianceBand(null, "2026-03-01")).toBe("none")
  })

  it("treats the 30-day boundary as expiring", () => {
    expect(complianceBand("2026-03-31", "2026-03-01")).toBe("expiring") // exactly 30
    expect(complianceBand("2026-04-01", "2026-03-01")).toBe("valid") // 31
  })

  it("is compliant only when verified and not expired", () => {
    expect(isCompliant("verified", "valid")).toBe(true)
    expect(isCompliant("verified", "expiring")).toBe(true)
    expect(isCompliant("verified", "expired")).toBe(false)
    expect(isCompliant("pending", "valid")).toBe(false)
    expect(isCompliant("rejected", "valid")).toBe(false)
  })
})
