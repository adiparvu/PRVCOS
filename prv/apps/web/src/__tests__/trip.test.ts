import { describe, it, expect } from "vitest"
import {
  tripDistanceKm,
  isOdometerRangeValid,
  costPerKm,
  canTransitionTrip,
  type TripStatus,
} from "@/lib/trip"

describe("tripDistanceKm", () => {
  it("returns the odometer delta", () => {
    expect(tripDistanceKm(12000, 12345)).toBe(345)
  })
  it("floors a reversed reading at zero", () => {
    expect(tripDistanceKm(12345, 12000)).toBe(0)
    expect(tripDistanceKm(12000, 12000)).toBe(0)
  })
})

describe("isOdometerRangeValid", () => {
  it("accepts an equal or larger closing reading", () => {
    expect(isOdometerRangeValid(100, 100)).toBe(true)
    expect(isOdometerRangeValid(100, 150)).toBe(true)
  })
  it("rejects a closing reading below the start", () => {
    expect(isOdometerRangeValid(150, 149)).toBe(false)
  })
})

describe("costPerKm", () => {
  it("divides fuel cost by distance, rounded to the cent", () => {
    expect(costPerKm(100, 250)).toBe(0.4)
    expect(costPerKm(100, 3)).toBe(33.33)
  })
  it("is zero for zero or negative distance", () => {
    expect(costPerKm(100, 0)).toBe(0)
    expect(costPerKm(100, -5)).toBe(0)
  })
})

describe("canTransitionTrip", () => {
  it("allows in_progress → completed/cancelled", () => {
    expect(canTransitionTrip("in_progress", "completed")).toBe(true)
    expect(canTransitionTrip("in_progress", "cancelled")).toBe(true)
  })
  it("forbids leaving a terminal state or a no-op", () => {
    for (const from of ["completed", "cancelled"] as TripStatus[]) {
      expect(canTransitionTrip(from, "completed")).toBe(false)
      expect(canTransitionTrip(from, "cancelled")).toBe(false)
    }
    expect(canTransitionTrip("in_progress", "in_progress")).toBe(false)
  })
})
