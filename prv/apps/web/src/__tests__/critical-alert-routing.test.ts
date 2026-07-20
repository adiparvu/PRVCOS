import { describe, it, expect } from "vitest"
import {
  CRITICAL_TRIGGERS,
  isCriticalTrigger,
  resolveRoute,
  type CriticalAlertRoute,
} from "@/lib/critical-alert-routing"

describe("CRITICAL_TRIGGERS / isCriticalTrigger", () => {
  it("keys are unique and recognised", () => {
    const keys = CRITICAL_TRIGGERS.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(isCriticalTrigger("finance.cash_below_threshold")).toBe(true)
    expect(isCriticalTrigger("ops.milestone_missed")).toBe(true)
  })
  it("rejects unknown keys", () => {
    expect(isCriticalTrigger("safety.incident")).toBe(false)
    expect(isCriticalTrigger("")).toBe(false)
  })
})

describe("resolveRoute", () => {
  const routes: CriticalAlertRoute[] = [
    { triggerKey: "finance.cash_below_threshold", routeToUserId: "cfo", isActive: true },
    { triggerKey: "ops.milestone_missed", routeToUserId: "opm", isActive: false },
  ]
  it("returns the recipient for an active route", () => {
    expect(resolveRoute(routes, "finance.cash_below_threshold")).toBe("cfo")
  })
  it("returns null for an inactive route", () => {
    expect(resolveRoute(routes, "ops.milestone_missed")).toBeNull()
  })
  it("returns null when no route is configured", () => {
    expect(resolveRoute(routes, "security.breach")).toBeNull()
    expect(resolveRoute([], "finance.cash_below_threshold")).toBeNull()
  })
})
