import { describe, it, expect } from "vitest"
import { computeFleetUtilization } from "@/lib/fleet-utilization"

function log(vehicleId: string, label: string, date: string, odometerKm: number) {
  return { vehicleId, label, date, odometerKm }
}

describe("computeFleetUtilization", () => {
  it("returns zeros for no logs", () => {
    const u = computeFleetUtilization([], 30)
    expect(u.totalKm).toBe(0)
    expect(u.vehiclesLogged).toBe(0)
    expect(u.avgKmPerActive).toBeNull()
    expect(u.avgKmPerDay).toBe(0)
  })

  it("computes km driven as latest minus earliest odometer per vehicle", () => {
    const u = computeFleetUtilization(
      [
        log("a", "Van A", "2026-07-01", 10000),
        log("a", "Van A", "2026-07-10", 10800),
        log("a", "Van A", "2026-07-05", 10400),
      ],
      30
    )
    expect(u.vehicles[0]!.kmDriven).toBe(800)
    expect(u.vehicles[0]!.logDays).toBe(3)
  })

  it("counts a single-reading vehicle as logged but not active", () => {
    const u = computeFleetUtilization([log("a", "Van A", "2026-07-01", 10000)], 30)
    expect(u.vehiclesLogged).toBe(1)
    expect(u.activeVehicles).toBe(0)
    expect(u.vehicles[0]!.kmDriven).toBe(0)
  })

  it("rolls up totals and averages across the fleet", () => {
    const u = computeFleetUtilization(
      [
        log("a", "Van A", "2026-07-01", 0),
        log("a", "Van A", "2026-07-31", 900),
        log("b", "Van B", "2026-07-01", 0),
        log("b", "Van B", "2026-07-31", 300),
      ],
      30
    )
    expect(u.totalKm).toBe(1200)
    expect(u.activeVehicles).toBe(2)
    expect(u.avgKmPerActive).toBe(600)
    expect(u.avgKmPerDay).toBe(40)
  })

  it("ranks vehicles by kilometres driven, descending", () => {
    const u = computeFleetUtilization(
      [
        log("a", "Van A", "2026-07-01", 0),
        log("a", "Van A", "2026-07-31", 200),
        log("b", "Van B", "2026-07-01", 0),
        log("b", "Van B", "2026-07-31", 900),
      ],
      30
    )
    expect(u.vehicles.map((v) => v.vehicleId)).toEqual(["b", "a"])
  })
})
