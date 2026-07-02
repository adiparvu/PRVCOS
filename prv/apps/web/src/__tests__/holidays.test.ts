import { describe, it, expect } from "vitest"
import { holidayForYear, isWeekend, countWorkingDays } from "@/lib/holidays"

describe("holidays helper", () => {
  it("expands a recurring holiday onto the requested year", () => {
    expect(holidayForYear("2020-01-01", true, 2026)).toBe("2026-01-01")
    expect(holidayForYear("2019-12-25", true, 2030)).toBe("2030-12-25")
  })

  it("keeps a one-off only in its own year", () => {
    expect(holidayForYear("2026-05-18", false, 2026)).toBe("2026-05-18")
    expect(holidayForYear("2024-03-03", false, 2026)).toBeNull()
  })

  it("detects weekends", () => {
    expect(isWeekend("2026-01-03")).toBe(true) // Saturday
    expect(isWeekend("2026-01-04")).toBe(true) // Sunday
    expect(isWeekend("2026-01-01")).toBe(false) // Thursday
  })

  it("counts working days excluding weekends and holidays", () => {
    // 2026-01-01 Thu … 2026-01-07 Wed → weekdays Thu,Fri,Mon,Tue,Wed = 5
    expect(countWorkingDays("2026-01-01", "2026-01-07")).toBe(5)
    // exclude New Year's Day → 4
    expect(countWorkingDays("2026-01-01", "2026-01-07", new Set(["2026-01-01"]))).toBe(4)
  })

  it("returns 0 for an inverted range", () => {
    expect(countWorkingDays("2026-01-07", "2026-01-01")).toBe(0)
  })
})
