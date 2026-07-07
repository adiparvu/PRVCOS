import { describe, it, expect } from "vitest"
import { computeFleetReadiness } from "@/lib/fleet-readiness"

const NOW = Date.parse("2026-07-06T00:00:00.000Z")
const inDays = (d: number) => new Date(NOW + d * 86_400_000).toISOString()

function veh(id: string, over: Partial<Parameters<typeof computeFleetReadiness>[0][number]> = {}) {
  return {
    id,
    label: `Vehicle ${id}`,
    status: "active",
    mileageKm: 50000,
    nextServiceAtKm: null,
    fuelLevelPct: null,
    insuranceExpiresAt: null,
    itpExpiresAt: null,
    ...over,
  }
}

describe("computeFleetReadiness", () => {
  it("marks a clean active vehicle as ready", () => {
    const r = computeFleetReadiness([veh("a")], NOW)
    expect(r.ready).toBe(1)
    expect(r.readinessRatePct).toBe(100)
    expect(r.attentionList).toHaveLength(0)
  })

  it("flags service overdue and due-soon as attention", () => {
    const r = computeFleetReadiness(
      [
        veh("over", { mileageKm: 60000, nextServiceAtKm: 59000 }),
        veh("soon", { mileageKm: 59500, nextServiceAtKm: 60000 }),
      ],
      NOW
    )
    expect(r.serviceDue).toBe(2)
    expect(r.attention).toBe(2)
    const over = r.attentionList.find((v) => v.id === "over")!
    expect(over.reasons).toContain("Service overdue")
    const soon = r.attentionList.find((v) => v.id === "soon")!
    expect(soon.reasons).toContain("Service in 500 km")
  })

  it("grounds a vehicle with expired insurance or ITP, or in maintenance", () => {
    const r = computeFleetReadiness(
      [veh("ins", { insuranceExpiresAt: inDays(-2) }), veh("maint", { status: "maintenance" })],
      NOW
    )
    expect(r.grounded).toBe(2)
    expect(r.complianceIssues).toBe(1)
    expect(r.attentionList.find((v) => v.id === "ins")!.reasons).toContain("Insurance expired")
    expect(r.attentionList.find((v) => v.id === "maint")!.reasons).toContain("In maintenance")
  })

  it("flags expiring compliance and low fuel as attention", () => {
    const r = computeFleetReadiness([veh("a", { itpExpiresAt: inDays(12), fuelLevelPct: 10 })], NOW)
    const v = r.attentionList[0]!
    expect(v.state).toBe("attention")
    expect(v.reasons).toContain("ITP expires in 12d")
    expect(v.reasons).toContain("Low fuel")
  })

  it("orders grounded ahead of attention in the list", () => {
    const r = computeFleetReadiness(
      [veh("att", { fuelLevelPct: 5 }), veh("gnd", { status: "maintenance" })],
      NOW
    )
    expect(r.attentionList[0]!.id).toBe("gnd")
    expect(r.attentionList[1]!.id).toBe("att")
  })

  it("computes the readiness rate over the fleet", () => {
    const r = computeFleetReadiness(
      [veh("a"), veh("b"), veh("c", { status: "maintenance" }), veh("d", { fuelLevelPct: 5 })],
      NOW
    )
    expect(r.total).toBe(4)
    expect(r.ready).toBe(2)
    expect(r.readinessRatePct).toBe(50)
  })
})
