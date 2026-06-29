import { describe, it, expect } from "vitest"
import {
  forecastTail,
  trendOf,
  eurK,
  buildDonut,
  weekDates,
  availabilityCell,
} from "@/lib/metrics-helpers"

describe("forecastTail", () => {
  it("returns an empty tail for empty input", () => {
    expect(forecastTail([])).toEqual([])
  })

  it("projects the recent growth onto a [last, next] tail", () => {
    // 100 → 110 is +10% growth; next = 110 * 1.1 = 121
    expect(forecastTail([100, 110])).toEqual([110, 121])
  })

  it("clamps explosive growth to +30%", () => {
    // 10 → 100 is +900%; clamped to +30% → 100 * 1.3 = 130
    expect(forecastTail([10, 100])).toEqual([100, 130])
  })

  it("clamps steep decline to -20%", () => {
    // 100 → 10 is -90%; clamped to -20% → 10 * 0.8 = 8
    expect(forecastTail([100, 10])).toEqual([10, 8])
  })

  it("projects a flat tail for a single point (prev defaults to last)", () => {
    // prev := last → 0% growth → 100 * 1.0 = 100
    expect(forecastTail([100])).toEqual([100, 100])
  })

  it("uses the default 8% growth when the previous value is zero", () => {
    // prev = 0 is not > 0, so growth falls back to 0.08 → 50 * 1.08 = 54
    expect(forecastTail([0, 50])).toEqual([50, 54])
  })
})

describe("trendOf", () => {
  it("marks an increase as up with an ▲ arrow", () => {
    const r = trendOf(120, 100)
    expect(r.dir).toBe("up")
    expect(r.trend).toBe("▲ 20%")
    expect(r.pct).toBe(70) // 50 + 20
  })

  it("marks a decrease as down with a ▼ arrow", () => {
    const r = trendOf(80, 100)
    expect(r.dir).toBe("down")
    expect(r.trend).toBe("▼ 20%")
    expect(r.pct).toBe(30) // 50 - 20
  })

  it("marks a flat change with a → arrow", () => {
    const r = trendOf(100, 100)
    expect(r.dir).toBe("flat")
    expect(r.trend).toBe("→ 0%")
    expect(r.pct).toBe(50)
  })

  it("treats growth from zero as +100%", () => {
    const r = trendOf(50, 0)
    expect(r.dir).toBe("up")
    expect(r.trend).toBe("▲ 100%")
    expect(r.pct).toBe(95) // clamped to max 95
  })

  it("reports flat when both current and previous are zero", () => {
    const r = trendOf(0, 0)
    expect(r.dir).toBe("flat")
    expect(r.pct).toBe(50)
  })

  it("clamps the progress percentage to the [8, 95] band", () => {
    expect(trendOf(1000, 100).pct).toBe(95)
    expect(trendOf(1, 100).pct).toBe(8)
  })
})

describe("eurK", () => {
  it("formats millions with one decimal", () => {
    expect(eurK(1_500_000)).toBe("€1.5M")
  })

  it("formats thousands rounded to whole K", () => {
    expect(eurK(482_400)).toBe("€482K")
  })

  it("formats sub-thousand values directly", () => {
    expect(eurK(640)).toBe("€640")
  })

  it("formats zero", () => {
    expect(eurK(0)).toBe("€0")
  })
})

describe("buildDonut", () => {
  it("returns an empty array when there is no revenue", () => {
    expect(buildDonut([])).toEqual([])
    expect(buildDonut([{ storeName: "A", revenue: 0 }])).toEqual([])
  })

  it("sorts stores by revenue descending", () => {
    const out = buildDonut([
      { storeName: "A", revenue: 100 },
      { storeName: "B", revenue: 300 },
      { storeName: "C", revenue: 200 },
    ])
    expect(out).toEqual([
      { label: "B", value: 300 },
      { label: "C", value: 200 },
      { label: "A", value: 100 },
    ])
  })

  it("labels a null store name as Unassigned", () => {
    expect(buildDonut([{ storeName: null, revenue: 500 }])).toEqual([
      { label: "Unassigned", value: 500 },
    ])
  })

  it("folds everything beyond the top N into an Other slice", () => {
    const out = buildDonut(
      [
        { storeName: "A", revenue: 50 },
        { storeName: "B", revenue: 40 },
        { storeName: "C", revenue: 30 },
        { storeName: "D", revenue: 20 },
        { storeName: "E", revenue: 5 },
        { storeName: "F", revenue: 3 },
      ],
      4
    )
    expect(out).toHaveLength(5)
    expect(out.at(-1)).toEqual({ label: "Other", value: 8 }) // 5 + 3
  })

  it("coerces string revenue (numeric column) to a number", () => {
    expect(buildDonut([{ storeName: "A", revenue: "123.40" }])).toEqual([
      { label: "A", value: 123 },
    ])
  })
})

describe("weekDates", () => {
  it("returns seven consecutive ISO dates from the given Monday", () => {
    expect(weekDates("2026-06-29")).toEqual([
      "2026-06-29",
      "2026-06-30",
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
      "2026-07-05",
    ])
  })

  it("crosses a month/year boundary correctly", () => {
    expect(weekDates("2025-12-29")).toEqual([
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
    ])
  })
})

describe("availabilityCell", () => {
  const shiftDates = new Set(["2026-06-30"])

  it("is 'no' on an approved-leave day", () => {
    const leave = [{ start: "2026-06-29", end: "2026-07-01" }]
    expect(availabilityCell("2026-06-30", leave, shiftDates)).toBe("no")
  })

  it("is 'yes' on a day the member holds a shift", () => {
    expect(availabilityCell("2026-06-30", [], shiftDates)).toBe("yes")
  })

  it("is 'maybe' with neither leave nor a shift", () => {
    expect(availabilityCell("2026-07-04", [], shiftDates)).toBe("maybe")
  })

  it("lets leave take precedence over a shift on the same day", () => {
    const leave = [{ start: "2026-06-30", end: "2026-06-30" }]
    expect(availabilityCell("2026-06-30", leave, shiftDates)).toBe("no")
  })
})
