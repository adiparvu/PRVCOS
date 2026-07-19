import { describe, it, expect } from "vitest"
import {
  computeInitialRun,
  advanceOnce,
  computeNextRun,
  isDue,
  parseRecipients,
  isReportFrequency,
  frequencyLabel,
} from "@/lib/report-schedule"

describe("computeInitialRun", () => {
  it("schedules today at the hour when it has not yet passed", () => {
    const now = new Date("2026-03-10T05:30:00Z")
    expect(computeInitialRun(now, 7).toISOString()).toBe("2026-03-10T07:00:00.000Z")
  })
  it("rolls to tomorrow when the hour already passed", () => {
    const now = new Date("2026-03-10T09:30:00Z")
    expect(computeInitialRun(now, 7).toISOString()).toBe("2026-03-11T07:00:00.000Z")
  })
  it("clamps an out-of-range hour", () => {
    const now = new Date("2026-03-10T05:00:00Z")
    expect(computeInitialRun(now, 99).getUTCHours()).toBe(23)
  })
})

describe("advanceOnce", () => {
  it("adds a day for daily", () => {
    expect(advanceOnce(new Date("2026-03-10T07:00:00Z"), "daily").toISOString()).toBe(
      "2026-03-11T07:00:00.000Z"
    )
  })
  it("adds seven days for weekly", () => {
    expect(advanceOnce(new Date("2026-03-10T07:00:00Z"), "weekly").toISOString()).toBe(
      "2026-03-17T07:00:00.000Z"
    )
  })
  it("adds a month for monthly, preserving time", () => {
    expect(advanceOnce(new Date("2026-03-15T07:00:00Z"), "monthly").toISOString()).toBe(
      "2026-04-15T07:00:00.000Z"
    )
  })
  it("clamps monthly to the last day of a shorter month", () => {
    // Jan 31 -> Feb 28 (2026 is not a leap year)
    expect(advanceOnce(new Date("2026-01-31T07:00:00Z"), "monthly").toISOString()).toBe(
      "2026-02-28T07:00:00.000Z"
    )
  })
})

describe("computeNextRun", () => {
  it("advances a single period when already future-adjacent", () => {
    const from = new Date("2026-03-10T07:00:00Z")
    const now = new Date("2026-03-10T07:00:00Z")
    expect(computeNextRun(from, "daily", now).toISOString()).toBe("2026-03-11T07:00:00.000Z")
  })
  it("catches up missed cycles with a single future run (no flood)", () => {
    // last run was 10 days ago on a daily schedule; next should be tomorrow-ish, once
    const from = new Date("2026-03-01T07:00:00Z")
    const now = new Date("2026-03-10T09:00:00Z")
    const next = computeNextRun(from, "daily", now)
    expect(next.getTime()).toBeGreaterThan(now.getTime())
    expect(next.toISOString()).toBe("2026-03-11T07:00:00.000Z")
  })
})

describe("isDue", () => {
  const now = new Date("2026-03-10T08:00:00Z")
  it("is due when enabled and nextRunAt has passed", () => {
    expect(isDue({ enabled: true, nextRunAt: new Date("2026-03-10T07:00:00Z") }, now)).toBe(true)
  })
  it("is not due when disabled", () => {
    expect(isDue({ enabled: false, nextRunAt: new Date("2026-03-10T07:00:00Z") }, now)).toBe(false)
  })
  it("is not due when nextRunAt is still in the future", () => {
    expect(isDue({ enabled: true, nextRunAt: new Date("2026-03-10T09:00:00Z") }, now)).toBe(false)
  })
})

describe("parseRecipients", () => {
  it("splits, validates, and dedupes case-insensitively", () => {
    const { valid, invalid } = parseRecipients("a@x.com, A@X.com\nbad-email; b@y.io")
    expect(valid).toEqual(["a@x.com", "b@y.io"])
    expect(invalid).toEqual(["bad-email"])
  })
  it("returns empties for blank input", () => {
    expect(parseRecipients("   ")).toEqual({ valid: [], invalid: [] })
  })
})

describe("isReportFrequency / frequencyLabel", () => {
  it("guards known frequencies", () => {
    expect(isReportFrequency("weekly")).toBe(true)
    expect(isReportFrequency("hourly")).toBe(false)
  })
  it("labels frequencies in Romanian", () => {
    expect(frequencyLabel("daily")).toBe("Zilnic")
    expect(frequencyLabel("monthly")).toBe("Lunar")
  })
})
