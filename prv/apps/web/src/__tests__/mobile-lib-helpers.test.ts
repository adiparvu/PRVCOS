import { vi, describe, it, expect, afterEach, beforeEach } from "vitest"

// Stub DB imports so the lib modules can be imported in a Node test environment
vi.mock("@prv/db", () => ({ db: {} }))
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    inArray: vi.fn(),
    not: vi.fn(),
    count: vi.fn(),
    isNull: vi.fn(),
    desc: vi.fn(),
    sql: vi.fn(),
  }
})

import { initials, lastActiveLabel } from "@/lib/mobile/people"
import {
  formatCurrency,
  parseMoney,
  daysOverdue,
  relativeTime,
  buildBriefing,
} from "@/lib/mobile/intelligence"

// ── initials ──────────────────────────────────────────────────────────────────

describe("initials", () => {
  it("returns uppercase initials from first and last name", () => {
    expect(initials("John", "Doe")).toBe("JD")
    expect(initials("Maria", "Ionescu")).toBe("MI")
  })

  it("uppercases lowercase input", () => {
    expect(initials("andrei", "popescu")).toBe("AP")
  })

  it("handles empty last name gracefully", () => {
    expect(initials("John", "")).toBe("J")
  })

  it("handles empty first name gracefully", () => {
    expect(initials("", "Doe")).toBe("D")
  })
})

// ── lastActiveLabel ───────────────────────────────────────────────────────────

describe("lastActiveLabel", () => {
  const NOW = new Date("2025-06-09T12:00:00Z").getTime()

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(NOW)
  })
  afterEach(() => vi.restoreAllMocks())

  it("returns null for null input", () => {
    expect(lastActiveLabel(null)).toBeNull()
  })

  it("returns 'Active now' for activity less than 2 minutes ago", () => {
    const d = new Date(NOW - 60_000)
    expect(lastActiveLabel(d)).toBe("Active now")
  })

  it("returns minutes label for activity 30 minutes ago", () => {
    const d = new Date(NOW - 30 * 60_000)
    expect(lastActiveLabel(d)).toBe("30m ago")
  })

  it("returns hours label for activity 5 hours ago", () => {
    const d = new Date(NOW - 5 * 3_600_000)
    expect(lastActiveLabel(d)).toBe("5h ago")
  })

  it("returns days label for activity 3 days ago", () => {
    const d = new Date(NOW - 3 * 86_400_000)
    expect(lastActiveLabel(d)).toBe("3d ago")
  })
})

// ── formatCurrency ────────────────────────────────────────────────────────────

describe("formatCurrency", () => {
  it("formats millions with one decimal (RON default)", () => {
    expect(formatCurrency(1_500_000)).toBe("1.5M RON")
    expect(formatCurrency(2_000_000)).toBe("2.0M RON")
  })

  it("formats thousands as rounded integer (RON)", () => {
    expect(formatCurrency(24_000)).toBe("24k RON")
    expect(formatCurrency(1_500)).toBe("2k RON")
  })

  it("formats sub-thousand as rounded integer (RON)", () => {
    expect(formatCurrency(850)).toBe("850 RON")
    expect(formatCurrency(0)).toBe("0 RON")
  })

  it("uses euro prefix when currency=EUR", () => {
    expect(formatCurrency(1_500_000, "EUR")).toBe("€1.5M")
    expect(formatCurrency(24_000, "EUR")).toBe("€24k")
    expect(formatCurrency(500, "EUR")).toBe("€500")
  })
})

// ── parseMoney ────────────────────────────────────────────────────────────────

describe("parseMoney", () => {
  it("parses a valid numeric string", () => {
    expect(parseMoney("1234.56")).toBeCloseTo(1234.56)
  })

  it("returns 0 for null", () => {
    expect(parseMoney(null)).toBe(0)
  })

  it("returns 0 for undefined", () => {
    expect(parseMoney(undefined)).toBe(0)
  })

  it("returns 0 for non-numeric string", () => {
    expect(parseMoney("abc")).toBe(0)
  })

  it("parses '0' as 0", () => {
    expect(parseMoney("0")).toBe(0)
  })
})

// ── daysOverdue ───────────────────────────────────────────────────────────────

describe("daysOverdue", () => {
  const NOW = new Date("2025-06-09T12:00:00Z").getTime()

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(NOW)
  })
  afterEach(() => vi.restoreAllMocks())

  it("returns 0 for null due date", () => {
    expect(daysOverdue(null)).toBe(0)
  })

  it("returns 0 for a future due date", () => {
    expect(daysOverdue("2025-06-15")).toBe(0)
  })

  it("returns correct day count for past due date", () => {
    expect(daysOverdue("2025-06-07T00:00:00Z")).toBe(2)
  })
})

// ── relativeTime ──────────────────────────────────────────────────────────────

describe("relativeTime", () => {
  const NOW = new Date("2025-06-09T12:00:00Z").getTime()

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(NOW)
  })
  afterEach(() => vi.restoreAllMocks())

  it("returns empty string for null input", () => {
    expect(relativeTime(null)).toBe("")
  })

  it("returns minutes label for 30 minutes ago", () => {
    const d = new Date(NOW - 30 * 60_000)
    expect(relativeTime(d)).toBe("30m ago")
  })

  it("accepts a string date", () => {
    const iso = new Date(NOW - 3 * 3_600_000).toISOString()
    expect(relativeTime(iso)).toBe("3h ago")
  })

  it("returns days label for 2 days ago", () => {
    const d = new Date(NOW - 2 * 86_400_000)
    expect(relativeTime(d)).toBe("2d ago")
  })
})

// ── buildBriefing ─────────────────────────────────────────────────────────────

describe("buildBriefing", () => {
  it("returns null when both months are zero and no overdue", () => {
    expect(buildBriefing(0, 0, 0, 0, 0)).toBeNull()
  })

  it("includes revenue-above-last-month when revenue is up", () => {
    const result = buildBriefing(12_000, 10_000, 0, 0, 90)
    expect(result).not.toBeNull()
    expect(result!.summary).toContain("20%")
    expect(result!.summary).toContain("above")
  })

  it("includes revenue-below-last-month when revenue is down", () => {
    const result = buildBriefing(8_000, 10_000, 0, 0, 90)
    expect(result!.summary).toContain("below")
  })

  it("adds overdue-invoice sentence when overdueCount > 0", () => {
    const result = buildBriefing(10_000, 0, 2, 0, 0)
    expect(result!.summary).toContain("overdue")
  })

  it("adds positive collection-rate insight when rate >= 85", () => {
    const result = buildBriefing(10_000, 8_000, 0, 0, 90)
    const text = result!.insights.join(" ")
    expect(text).toContain("90%")
    expect(text).toContain("healthy")
  })

  it("adds warning collection-rate insight when rate < 70", () => {
    const result = buildBriefing(10_000, 8_000, 0, 0, 60)
    const text = result!.insights.join(" ")
    expect(text).toContain("60%")
    expect(text).toContain("prioritise")
  })

  it("adds project insight when activeProjects >= 5", () => {
    const result = buildBriefing(10_000, 8_000, 0, 5, 80)
    const text = result!.insights.join(" ")
    expect(text).toContain("5 active projects")
  })

  it("caps insights list to 3 items", () => {
    const result = buildBriefing(12_000, 10_000, 3, 6, 60)
    expect(result!.insights.length).toBeLessThanOrEqual(3)
  })
})
