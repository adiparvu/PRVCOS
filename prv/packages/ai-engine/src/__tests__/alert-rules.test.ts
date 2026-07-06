import { describe, it, expect } from "vitest"
import { evaluateAlertRules, type AlertRuleInput } from "../alert-rules"

const quiet: AlertRuleInput = {
  revenueDeltaPct: 0,
  cashPosition: null,
  cashThreshold: 10000,
  attendanceRatePct: 95,
  openCriticalSafety: 0,
  stockoutRisk: 0,
  overdueApprovalsOver48h: 0,
  healthScore: 85,
}

describe("evaluateAlertRules", () => {
  it("raises nothing when all signals are within threshold", () => {
    expect(evaluateAlertRules(quiet)).toEqual([])
  })

  it("raises an L2 on a revenue drop worse than 20%", () => {
    const specs = evaluateAlertRules({ ...quiet, revenueDeltaPct: -24 })
    expect(specs).toHaveLength(1)
    expect(specs[0]!.ruleKey).toBe("revenue_drop")
    expect(specs[0]!.severity).toBe("l2_warning")
    expect(specs[0]!.title).toBe("Revenue down 24%")
  })

  it("does not raise revenue on a drop within 20% or on growth", () => {
    expect(evaluateAlertRules({ ...quiet, revenueDeltaPct: -19 })).toEqual([])
    expect(evaluateAlertRules({ ...quiet, revenueDeltaPct: 30 })).toEqual([])
  })

  it("skips signals that are null (not wired) rather than treating them as zero", () => {
    // cashPosition null → no cash alert even though threshold is positive
    expect(evaluateAlertRules({ ...quiet, cashPosition: null })).toEqual([])
    // attendance null → no attendance alert
    expect(evaluateAlertRules({ ...quiet, attendanceRatePct: null })).toEqual([])
  })

  it("raises an L3 when cash falls below the threshold", () => {
    const specs = evaluateAlertRules({ ...quiet, cashPosition: 5000, cashThreshold: 10000 })
    expect(specs[0]!.ruleKey).toBe("cash_low")
    expect(specs[0]!.severity).toBe("l3_critical")
  })

  it("raises attendance, approvals, safety, stockout and health rules", () => {
    const specs = evaluateAlertRules({
      ...quiet,
      attendanceRatePct: 62,
      overdueApprovalsOver48h: 3,
      openCriticalSafety: 1,
      stockoutRisk: 2,
      healthScore: 44,
    })
    const keys = specs.map((s) => s.ruleKey)
    expect(keys).toContain("attendance_cliff")
    expect(keys).toContain("approvals_stale")
    expect(keys).toContain("safety_incident")
    expect(keys).toContain("inventory_stockout")
    expect(keys).toContain("health_critical")
  })

  it("orders critical (L3) ahead of warning (L2)", () => {
    const specs = evaluateAlertRules({
      ...quiet,
      revenueDeltaPct: -25, // L2
      healthScore: 40, // L3
    })
    expect(specs[0]!.severity).toBe("l3_critical")
    expect(specs[specs.length - 1]!.severity).toBe("l2_warning")
  })

  it("uses singular/plural wording for counts", () => {
    expect(evaluateAlertRules({ ...quiet, stockoutRisk: 1 })[0]!.title).toBe(
      "1 product at stockout risk"
    )
    expect(evaluateAlertRules({ ...quiet, stockoutRisk: 4 })[0]!.title).toBe(
      "4 products at stockout risk"
    )
  })
})
