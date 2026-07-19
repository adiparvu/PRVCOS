import { describe, it, expect } from "vitest"
import { expandRecurrence, MAX_OCCURRENCES } from "@/lib/recurrence"

describe("expandRecurrence", () => {
  it("expands a daily series inclusively", () => {
    expect(expandRecurrence("2026-01-01", "daily", "2026-01-04")).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
    ])
  })

  it("expands weekly and biweekly", () => {
    expect(expandRecurrence("2026-01-01", "weekly", "2026-01-22")).toEqual([
      "2026-01-01",
      "2026-01-08",
      "2026-01-15",
      "2026-01-22",
    ])
    expect(expandRecurrence("2026-01-01", "biweekly", "2026-02-01")).toEqual([
      "2026-01-01",
      "2026-01-15",
      "2026-01-29",
    ])
  })

  it("expands monthly and clamps to the last day of short months", () => {
    expect(expandRecurrence("2026-01-31", "monthly", "2026-03-31")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ])
  })

  it("returns just the start when until is before it", () => {
    expect(expandRecurrence("2026-01-10", "daily", "2026-01-05")).toEqual(["2026-01-10"])
  })

  it("includes the start when until equals it", () => {
    expect(expandRecurrence("2026-01-10", "weekly", "2026-01-10")).toEqual(["2026-01-10"])
  })

  it("caps the number of occurrences", () => {
    const out = expandRecurrence("2026-01-01", "daily", "2030-01-01", 5)
    expect(out.length).toBe(5)
    const capped = expandRecurrence("2026-01-01", "daily", "2030-01-01", 999)
    expect(capped.length).toBe(MAX_OCCURRENCES)
  })
})
