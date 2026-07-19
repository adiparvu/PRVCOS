import { describe, it, expect } from "vitest"
import {
  computeDurationMinutes,
  elapsedMinutes,
  addHoursFromMinutes,
  canStartTimer,
  formatDuration,
} from "@/lib/task-timer"

describe("computeDurationMinutes", () => {
  it("floors whole minutes between start and end", () => {
    expect(
      computeDurationMinutes(new Date("2026-03-10T08:00:00Z"), new Date("2026-03-10T09:25:40Z"))
    ).toBe(85)
  })
  it("is 0 for a sub-minute run", () => {
    expect(
      computeDurationMinutes(new Date("2026-03-10T08:00:00Z"), new Date("2026-03-10T08:00:30Z"))
    ).toBe(0)
  })
  it("is 0 when end precedes start (clock skew guard)", () => {
    expect(
      computeDurationMinutes(new Date("2026-03-10T09:00:00Z"), new Date("2026-03-10T08:00:00Z"))
    ).toBe(0)
  })
})

describe("elapsedMinutes", () => {
  it("mirrors computeDurationMinutes for a running entry", () => {
    expect(elapsedMinutes(new Date("2026-03-10T08:00:00Z"), new Date("2026-03-10T08:45:00Z"))).toBe(
      45
    )
  })
})

describe("addHoursFromMinutes", () => {
  it("adds minutes as hours to an existing total", () => {
    expect(addHoursFromMinutes("2.00", 90)).toBe("3.50")
  })
  it("treats null/invalid base as zero", () => {
    expect(addHoursFromMinutes(null, 30)).toBe("0.50")
    expect(addHoursFromMinutes("abc", 60)).toBe("1.00")
  })
  it("rounds to two decimals", () => {
    expect(addHoursFromMinutes("0", 25)).toBe("0.42")
  })
})

describe("canStartTimer", () => {
  it("allows starting when nothing is running", () => {
    expect(canStartTimer(false)).toEqual({ ok: true })
  })
  it("rejects when a timer is already running", () => {
    const r = canStartTimer(true)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/already running/i)
  })
})

describe("formatDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatDuration(85)).toBe("1h 25m")
    expect(formatDuration(40)).toBe("40m")
    expect(formatDuration(120)).toBe("2h")
    expect(formatDuration(0)).toBe("0m")
  })
})
