import { describe, it, expect } from "vitest"
import { timelineWindow, datePct, pctToISO } from "@/lib/gantt"

describe("timelineWindow", () => {
  it("pads a multi-date range by 3 days each side", () => {
    expect(timelineWindow(["2026-01-10", "2026-01-20"])).toEqual({
      startISO: "2026-01-07",
      endISO: "2026-01-23",
    })
  })
  it("gives a single date ±15 days of context", () => {
    expect(timelineWindow(["2026-01-15"])).toEqual({
      startISO: "2025-12-31",
      endISO: "2026-01-30",
    })
  })
  it("falls back for no dates", () => {
    expect(timelineWindow([])).toEqual({ startISO: "1970-01-01", endISO: "1970-01-31" })
  })
})

describe("datePct", () => {
  const start = "2026-01-01"
  const end = "2026-01-11" // 10-day window
  it("maps ends and middle", () => {
    expect(datePct("2026-01-01", start, end)).toBe(0)
    expect(datePct("2026-01-11", start, end)).toBe(100)
    expect(datePct("2026-01-06", start, end)).toBe(50)
  })
  it("clamps out-of-window dates", () => {
    expect(datePct("2025-12-01", start, end)).toBe(0)
    expect(datePct("2026-02-01", start, end)).toBe(100)
  })
})

describe("pctToISO", () => {
  const start = "2026-01-01"
  const end = "2026-01-11"
  it("inverts datePct at day resolution", () => {
    expect(pctToISO(0, start, end)).toBe("2026-01-01")
    expect(pctToISO(100, start, end)).toBe("2026-01-11")
    expect(pctToISO(50, start, end)).toBe("2026-01-06")
  })
  it("clamps out-of-range percentages", () => {
    expect(pctToISO(-20, start, end)).toBe("2026-01-01")
    expect(pctToISO(200, start, end)).toBe("2026-01-11")
  })
})
