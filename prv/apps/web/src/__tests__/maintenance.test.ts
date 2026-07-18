import { describe, it, expect } from "vitest"
import {
  isOpenMaintenance,
  canTransitionMaintenance,
  assetInMaintenance,
  returnsToServiceOnClose,
  type MaintenanceStatus,
} from "@/lib/maintenance"

describe("isOpenMaintenance", () => {
  it("treats scheduled and in_progress as open", () => {
    expect(isOpenMaintenance("scheduled")).toBe(true)
    expect(isOpenMaintenance("in_progress")).toBe(true)
  })
  it("treats completed and cancelled as closed", () => {
    expect(isOpenMaintenance("completed")).toBe(false)
    expect(isOpenMaintenance("cancelled")).toBe(false)
  })
})

describe("canTransitionMaintenance", () => {
  it("allows the forward moves", () => {
    expect(canTransitionMaintenance("scheduled", "in_progress")).toBe(true)
    expect(canTransitionMaintenance("scheduled", "completed")).toBe(true)
    expect(canTransitionMaintenance("scheduled", "cancelled")).toBe(true)
    expect(canTransitionMaintenance("in_progress", "completed")).toBe(true)
    expect(canTransitionMaintenance("in_progress", "cancelled")).toBe(true)
  })
  it("forbids leaving a terminal state", () => {
    for (const from of ["completed", "cancelled"] as MaintenanceStatus[]) {
      for (const to of [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ] as MaintenanceStatus[]) {
        expect(canTransitionMaintenance(from, to)).toBe(false)
      }
    }
  })
  it("forbids a no-op transition", () => {
    expect(canTransitionMaintenance("scheduled", "scheduled")).toBe(false)
    expect(canTransitionMaintenance("in_progress", "in_progress")).toBe(false)
  })
  it("forbids moving back to scheduled", () => {
    expect(canTransitionMaintenance("in_progress", "scheduled")).toBe(false)
  })
})

describe("assetInMaintenance", () => {
  it("is out of service with one or more open records", () => {
    expect(assetInMaintenance(0)).toBe(false)
    expect(assetInMaintenance(1)).toBe(true)
    expect(assetInMaintenance(3)).toBe(true)
  })
})

describe("returnsToServiceOnClose", () => {
  it("returns to service only when closing the last open record", () => {
    expect(returnsToServiceOnClose(1)).toBe(true)
    expect(returnsToServiceOnClose(0)).toBe(true)
    expect(returnsToServiceOnClose(2)).toBe(false)
  })
})
