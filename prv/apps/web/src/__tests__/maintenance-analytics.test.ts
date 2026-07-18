import { describe, it, expect } from "vitest"
import {
  computeMaintenanceAnalytics,
  type MaintenanceRecordInput,
  type TripInput,
} from "@/lib/maintenance-analytics"

const records: MaintenanceRecordInput[] = [
  { assetType: "vehicle", type: "Service", status: "completed", cost: 500 },
  { assetType: "vehicle", type: "Reparație", status: "in_progress", cost: 300 },
  { assetType: "tool", type: "Service", status: "scheduled", cost: 120 },
  { assetType: "tool", type: "Calibrare", status: "completed", cost: 80 },
  { assetType: "vehicle", type: "Service", status: "cancelled", cost: 999 },
  { assetType: "tool", type: "Service", status: "completed", cost: null },
]

const trips: TripInput[] = [
  { status: "completed", distanceKm: 120, fuelCost: 90 },
  { status: "completed", distanceKm: 80, fuelCost: 60 },
  { status: "in_progress", distanceKm: null, fuelCost: null },
  { status: "cancelled", distanceKm: 500, fuelCost: 400 },
]

describe("computeMaintenanceAnalytics", () => {
  const a = computeMaintenanceAnalytics(records, trips)

  it("counts records by state", () => {
    expect(a.totalRecords).toBe(6)
    expect(a.openRecords).toBe(2) // in_progress + scheduled
    expect(a.completedRecords).toBe(3)
  })

  it("excludes cancelled work from cost", () => {
    // 500 + 300 + 120 + 80 + 0 (null) = 1000; the 999 cancelled is ignored
    expect(a.totalCost).toBe(1000)
  })

  it("splits cost by asset type", () => {
    expect(a.costByAssetType).toEqual({ vehicle: 800, tool: 200 })
  })

  it("groups cost by work type, most expensive first", () => {
    expect(a.costByType[0]).toEqual({ type: "Service", cost: 620, count: 3 })
    expect(a.costByType.find((t) => t.type === "Reparație")).toEqual({
      type: "Reparație",
      cost: 300,
      count: 1,
    })
  })

  it("aggregates trips, ignoring cancelled", () => {
    expect(a.trips.total).toBe(4)
    expect(a.trips.completed).toBe(2)
    expect(a.trips.totalDistanceKm).toBe(200)
    expect(a.trips.totalFuelCost).toBe(150)
  })

  it("handles empty input", () => {
    const e = computeMaintenanceAnalytics([], [])
    expect(e.totalRecords).toBe(0)
    expect(e.totalCost).toBe(0)
    expect(e.costByType).toEqual([])
    expect(e.trips.totalDistanceKm).toBe(0)
  })
})
