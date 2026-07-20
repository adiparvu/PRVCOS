import { describe, it, expect } from "vitest"
import { exportDateBounds, summarizeExport } from "@/lib/communication-export"

const NOW = new Date("2026-07-20T12:00:00.000Z")
const YEAR = 365 * 24 * 60 * 60 * 1000

describe("exportDateBounds", () => {
  it("defaults to the trailing year when nothing is supplied", () => {
    const b = exportDateBounds(null, null, NOW)
    expect(b.toMs).toBe(NOW.getTime())
    expect(b.fromMs).toBe(NOW.getTime() - YEAR)
    expect(b.defaulted).toBe(true)
  })
  it("honors an explicit valid range", () => {
    const b = exportDateBounds("2026-01-01T00:00:00Z", "2026-06-30T00:00:00Z", NOW)
    expect(b.fromMs).toBe(Date.parse("2026-01-01T00:00:00Z"))
    expect(b.toMs).toBe(Date.parse("2026-06-30T00:00:00Z"))
    expect(b.defaulted).toBe(false)
  })
  it("defaults `from` to a year before an explicit `to`", () => {
    const b = exportDateBounds(null, "2026-06-30T00:00:00Z", NOW)
    expect(b.toMs).toBe(Date.parse("2026-06-30T00:00:00Z"))
    expect(b.fromMs).toBe(Date.parse("2026-06-30T00:00:00Z") - YEAR)
    expect(b.defaulted).toBe(true)
  })
  it("collapses an inverted range to an empty window (never everything)", () => {
    const b = exportDateBounds("2026-06-30T00:00:00Z", "2026-01-01T00:00:00Z", NOW)
    expect(b.fromMs).toBe(b.toMs)
  })
  it("treats a malformed date as absent", () => {
    const b = exportDateBounds("not-a-date", null, NOW)
    expect(b.defaulted).toBe(true)
    expect(b.fromMs).toBe(NOW.getTime() - YEAR)
  })
})

describe("summarizeExport", () => {
  it("packages the counts and truncation flag", () => {
    expect(summarizeExport(3, 120, 8, false)).toEqual({
      channels: 3,
      channelMessages: 120,
      announcements: 8,
      truncated: false,
    })
  })
})
