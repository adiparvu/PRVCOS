import { vi, describe, it, expect, afterEach } from "vitest"

// Mock @tanstack/react-query and the api client since useStores imports them
vi.mock("@tanstack/react-query", () => ({ useQuery: vi.fn() }))
vi.mock("@/lib/api", () => ({ api: { get: vi.fn() } }))

import { formatRevenue, getInitials, formatDueDate } from "@/hooks/useStores"

// ── formatRevenue ─────────────────────────────────────────────────────────────

describe("formatRevenue", () => {
  it("formats millions with one decimal", () => {
    expect(formatRevenue(1_500_000)).toBe("€1.5M")
    expect(formatRevenue(2_000_000)).toBe("€2.0M")
  })

  it("formats thousands with one decimal", () => {
    expect(formatRevenue(24_000)).toBe("€24.0k")
    expect(formatRevenue(1_500)).toBe("€1.5k")
  })

  it("formats sub-thousand as rounded integer", () => {
    expect(formatRevenue(850)).toBe("€850")
    expect(formatRevenue(0)).toBe("€0")
    expect(formatRevenue(999)).toBe("€999")
  })
})

// ── getInitials ───────────────────────────────────────────────────────────────

describe("getInitials", () => {
  it("returns uppercase initials from two-word name", () => {
    expect(getInitials("Andrei Popescu")).toBe("AP")
    expect(getInitials("Maria Ionescu")).toBe("MI")
  })

  it("handles single-word name", () => {
    expect(getInitials("Andrei")).toBe("A")
  })

  it("trims leading/trailing whitespace", () => {
    expect(getInitials("  Andrei Popescu  ")).toBe("AP")
  })

  it("works with lowercase input", () => {
    expect(getInitials("andrei popescu")).toBe("AP")
  })
})

// ── formatDueDate ─────────────────────────────────────────────────────────────
// Uses Date.now() internally — mock it for deterministic tests.

describe("formatDueDate", () => {
  const NOW = new Date("2025-06-09T12:00:00Z").getTime()

  afterEach(() => vi.restoreAllMocks())

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(NOW)
  })

  it("returns em-dash label for null dueDate", () => {
    const result = formatDueDate(null, false)
    expect(result.label).toBe("—")
  })

  it("returns overdue label with negative days when isOverdue=true", () => {
    const yesterday = new Date("2025-06-08T12:00:00Z").toISOString()
    const result = formatDueDate(yesterday, true)
    expect(result.label).toContain("overdue")
  })

  it("returns 'Today' for same-day due date", () => {
    const today = new Date("2025-06-09T23:59:00Z").toISOString()
    const result = formatDueDate(today, false)
    expect(result.label).toBe("Today")
  })

  it("returns 'Tomorrow' for next-day due date", () => {
    const tomorrow = new Date("2025-06-10T12:00:00Z").toISOString()
    const result = formatDueDate(tomorrow, false)
    expect(result.label).toBe("Tomorrow")
  })

  it("returns 'Nd' for 2-6 days out", () => {
    const threeDays = new Date("2025-06-12T12:00:00Z").toISOString()
    const result = formatDueDate(threeDays, false)
    expect(result.label).toBe("3d")
  })

  it("returns formatted date for 7+ days out", () => {
    const twoWeeks = new Date("2025-06-23T12:00:00Z").toISOString()
    const result = formatDueDate(twoWeeks, false)
    expect(result.label).toMatch(/\d{1,2}\s+\w+/)
  })
})

// ── command screen helpers (inline, duplicated for testing) ──────────────────

function getGreeting(hourOfDay: number): string {
  if (hourOfDay < 12) return "Good morning"
  if (hourOfDay < 17) return "Good afternoon"
  return "Good evening"
}

describe("getGreeting", () => {
  it("returns 'Good morning' before noon", () => {
    expect(getGreeting(0)).toBe("Good morning")
    expect(getGreeting(11)).toBe("Good morning")
  })

  it("returns 'Good afternoon' from noon to 16:59", () => {
    expect(getGreeting(12)).toBe("Good afternoon")
    expect(getGreeting(16)).toBe("Good afternoon")
  })

  it("returns 'Good evening' from 17:00 onwards", () => {
    expect(getGreeting(17)).toBe("Good evening")
    expect(getGreeting(23)).toBe("Good evening")
  })
})
