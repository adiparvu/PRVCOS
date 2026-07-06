import { describe, it, expect } from "vitest"
import { computeModuleStatus, MODULE_REGISTRY } from "@/lib/module-status"

function ev(entityType: string | null, gateFailed = false, createdAt = "2026-07-06T10:00:00.000Z") {
  return { entityType, gateFailed, createdAt }
}

describe("computeModuleStatus", () => {
  it("lists every registered module even with no activity (idle)", () => {
    const res = computeModuleStatus([], 24)
    expect(res.modules).toHaveLength(MODULE_REGISTRY.length)
    expect(res.modules.every((m) => m.state === "idle")).toBe(true)
    expect(res.summary).toEqual({ totalEvents: 0, totalFailures: 0, activeModules: 0 })
  })

  it("maps entity types to their module and counts events + last activity", () => {
    const res = computeModuleStatus(
      [
        ev("invoice", false, "2026-07-06T09:00:00.000Z"),
        ev("expense", false, "2026-07-06T11:30:00.000Z"),
        ev("project", false, "2026-07-06T08:00:00.000Z"),
      ],
      24
    )
    const finance = res.modules.find((m) => m.key === "finance")!
    expect(finance.events).toBe(2)
    expect(finance.state).toBe("active")
    expect(finance.lastActivity).toBe("2026-07-06T11:30:00.000Z")
    expect(res.modules.find((m) => m.key === "projects")!.events).toBe(1)
    expect(res.summary.totalEvents).toBe(3)
    expect(res.summary.activeModules).toBe(2)
  })

  it("flags a module as alert when an access-control check failed", () => {
    const res = computeModuleStatus([ev("order", true), ev("order", false)], 24)
    const shop = res.modules.find((m) => m.key === "shop")!
    expect(shop.failures).toBe(1)
    expect(shop.state).toBe("alert")
    expect(res.summary.totalFailures).toBe(1)
    // alert sorts ahead of active/idle
    expect(res.modules[0]!.key).toBe("shop")
  })

  it("collects unmapped entity types under Other, hidden when empty", () => {
    const none = computeModuleStatus([ev("project")], 24)
    expect(none.modules.find((m) => m.key === "other")).toBeUndefined()
    const some = computeModuleStatus([ev("weird_thing"), ev(null)], 24)
    const other = some.modules.find((m) => m.key === "other")!
    expect(other.events).toBe(2)
    expect(other.state).toBe("active")
  })

  it("orders alert, then active, then idle; ties by event count", () => {
    const res = computeModuleStatus(
      [ev("invoice"), ev("invoice"), ev("project"), ev("order", true)],
      24
    )
    const states = res.modules.map((m) => m.state)
    // first is the alert (shop), then actives by event count (finance 2 > projects 1), then idles
    expect(res.modules[0]!.key).toBe("shop")
    expect(res.modules[1]!.key).toBe("finance")
    expect(res.modules[2]!.key).toBe("projects")
    expect(states.slice(3).every((s) => s === "idle")).toBe(true)
  })
})
