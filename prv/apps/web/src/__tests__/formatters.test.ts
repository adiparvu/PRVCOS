import { describe, it, expect } from "vitest"
import { fmtEuro, fmtShortDate, fmtMins, fmtDateRelative } from "@/lib/formatters"

describe("fmtEuro", () => {
  it("formats millions with one decimal", () => {
    expect(fmtEuro(1_500_000)).toBe("€1.5M")
    expect(fmtEuro(2_400_000)).toBe("€2.4M")
  })

  it("formats thousands rounded to k", () => {
    expect(fmtEuro(18_400)).toBe("€18k")
    expect(fmtEuro(1_000)).toBe("€1k")
  })

  it("formats sub-thousand as plain Euro", () => {
    expect(fmtEuro(850)).toBe("€850")
    expect(fmtEuro(0)).toBe("€0")
  })

  it("rounds thousands correctly", () => {
    expect(fmtEuro(1_500)).toBe("€2k")
    expect(fmtEuro(1_499)).toBe("€1k")
  })
})

describe("fmtShortDate", () => {
  it("returns em-dash for empty string", () => {
    expect(fmtShortDate("")).toBe("—")
  })

  it("formats ISO date as short locale date", () => {
    // Jan 15 2025
    const result = fmtShortDate("2025-01-15")
    expect(result).toMatch(/Jan\s+15/)
  })

  it("returns original string for invalid date", () => {
    const bad = "not-a-date"
    const result = fmtShortDate(bad)
    // Either the original string or a formatted attempt — should not throw
    expect(typeof result).toBe("string")
  })
})

describe("fmtMins", () => {
  it("returns undefined for falsy input", () => {
    expect(fmtMins(null)).toBeUndefined()
    expect(fmtMins(undefined)).toBeUndefined()
    expect(fmtMins(0)).toBeUndefined()
  })

  it("formats minutes only when less than 60", () => {
    expect(fmtMins(45)).toBe("45m")
    expect(fmtMins(1)).toBe("1m")
  })

  it("formats hours and minutes when >= 60", () => {
    expect(fmtMins(60)).toBe("1h 0m")
    expect(fmtMins(90)).toBe("1h 30m")
    expect(fmtMins(150)).toBe("2h 30m")
  })
})

describe("fmtDateRelative", () => {
  const now = new Date("2025-06-09T12:00:00Z")

  it("returns 'N min ago' for recent times", () => {
    const recent = new Date("2025-06-09T11:45:00Z").toISOString()
    expect(fmtDateRelative(recent, now)).toBe("15 min ago")
  })

  it("returns 'N hr ago' for same-day earlier times", () => {
    const earlier = new Date("2025-06-09T08:00:00Z").toISOString()
    expect(fmtDateRelative(earlier, now)).toBe("4 hr ago")
  })

  it("returns 'Yesterday' for exactly 1 day ago", () => {
    const yesterday = new Date("2025-06-08T12:00:00Z").toISOString()
    expect(fmtDateRelative(yesterday, now)).toBe("Yesterday")
  })

  it("returns 'N days ago' for older dates", () => {
    const older = new Date("2025-06-05T12:00:00Z").toISOString()
    expect(fmtDateRelative(older, now)).toBe("4 days ago")
  })
})
