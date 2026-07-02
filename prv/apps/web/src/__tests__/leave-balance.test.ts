import { describe, it, expect } from "vitest"
import { computeLeaveBalance } from "@/lib/leave-balance"

describe("computeLeaveBalance", () => {
  it("computes available as entitlement + carried − used − pending", () => {
    const r = computeLeaveBalance({
      entitlementDays: 21,
      carriedOverDays: 5,
      usedDays: 11.5,
      pendingDays: 2.5,
    })
    expect(r.entitlementTotal).toBe(26)
    expect(r.available).toBe(12)
    expect(r.accruedToDate).toBeNull()
  })

  it("returns accrued-to-date capped at entitlement when an accrual rate is set", () => {
    const r = computeLeaveBalance({
      entitlementDays: 21,
      carriedOverDays: 0,
      usedDays: 0,
      pendingDays: 0,
      accrualDaysPerMonth: 1.75,
      monthsElapsed: 6,
    })
    expect(r.accruedToDate).toBe(10.5) // 1.75 × 6
  })

  it("caps accrual at the annual entitlement", () => {
    const r = computeLeaveBalance({
      entitlementDays: 20,
      carriedOverDays: 0,
      usedDays: 0,
      pendingDays: 0,
      accrualDaysPerMonth: 2,
      monthsElapsed: 12,
    })
    expect(r.accruedToDate).toBe(20) // 2×12=24 capped to 20
  })

  it("allows a negative available when overdrawn", () => {
    const r = computeLeaveBalance({
      entitlementDays: 5,
      carriedOverDays: 0,
      usedDays: 7,
      pendingDays: 0,
    })
    expect(r.available).toBe(-2)
  })
})
