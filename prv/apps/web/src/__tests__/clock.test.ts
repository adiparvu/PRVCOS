import { describe, it, expect } from "vitest"
import { resolveClockAction, lateMinutes, isGpsVerified, clockInStatus } from "@/lib/clock"

const d = (s: string) => new Date(s)

describe("resolveClockAction", () => {
  it("clocks in when there is no record or no clock-in", () => {
    expect(resolveClockAction(null)).toBe("clock_in")
    expect(resolveClockAction({ clockIn: null, clockOut: null })).toBe("clock_in")
  })
  it("clocks out when clocked in but not out", () => {
    expect(resolveClockAction({ clockIn: d("2026-01-01T08:00:00Z"), clockOut: null })).toBe(
      "clock_out"
    )
  })
  it("is done when both are set", () => {
    expect(
      resolveClockAction({
        clockIn: d("2026-01-01T08:00:00Z"),
        clockOut: d("2026-01-01T17:00:00Z"),
      })
    ).toBe("done")
  })
})

describe("lateMinutes", () => {
  it("is the positive difference from the scheduled start", () => {
    expect(lateMinutes("08:00", "08:12")).toBe(12)
    expect(lateMinutes("08:00", "09:30")).toBe(90)
  })
  it("floors early or on-time arrivals at zero", () => {
    expect(lateMinutes("08:00", "07:55")).toBe(0)
    expect(lateMinutes("08:00", "08:00")).toBe(0)
  })
})

describe("isGpsVerified", () => {
  it("is false without a coordinate", () => {
    expect(isGpsVerified(null, null, 10)).toBe(false)
    expect(isGpsVerified(44.4, null, 10)).toBe(false)
  })
  it("accepts a coordinate within the accuracy threshold", () => {
    expect(isGpsVerified(44.4, 26.1, 40)).toBe(true)
    expect(isGpsVerified(44.4, 26.1, 150)).toBe(true)
  })
  it("rejects a coordinate outside the accuracy threshold", () => {
    expect(isGpsVerified(44.4, 26.1, 300)).toBe(false)
  })
  it("accepts a coordinate with unknown accuracy", () => {
    expect(isGpsVerified(44.4, 26.1, null)).toBe(true)
  })
})

describe("clockInStatus", () => {
  it("is late only when minutes late is positive", () => {
    expect(clockInStatus(0)).toBe("present")
    expect(clockInStatus(1)).toBe("late")
  })
})
