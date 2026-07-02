import { describe, it, expect } from "vitest"
import { timeRangesOverlap, findConflict } from "@/lib/shift-overlap"

describe("shift overlap", () => {
  it("detects overlapping time ranges", () => {
    expect(timeRangesOverlap("08:00", "16:00", "12:00", "20:00")).toBe(true)
    expect(timeRangesOverlap("08:00", "16:00", "15:00", "17:00")).toBe(true)
  })

  it("treats touching ranges as non-overlapping", () => {
    expect(timeRangesOverlap("08:00", "12:00", "12:00", "16:00")).toBe(false)
    expect(timeRangesOverlap("13:00", "17:00", "08:00", "13:00")).toBe(false)
  })

  it("finds the first conflicting shift or null", () => {
    const others = [
      { id: "a", title: "Morning", startTime: "06:00", endTime: "10:00" },
      { id: "b", title: "Afternoon", startTime: "13:00", endTime: "18:00" },
    ]
    expect(findConflict("09:00", "12:00", others)?.id).toBe("a")
    expect(findConflict("11:00", "12:30", others)).toBeNull()
  })
})
