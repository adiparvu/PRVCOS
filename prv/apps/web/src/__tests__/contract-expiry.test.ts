import { describe, it, expect } from "vitest"
import { daysUntil, contractAlert } from "@/lib/contract-expiry"

describe("contract expiry", () => {
  it("counts whole days until the end date", () => {
    expect(daysUntil("2026-01-10", "2026-01-01")).toBe(9)
    expect(daysUntil("2026-01-01", "2026-01-10")).toBe(-9)
  })

  it("returns the tightest alert threshold within range", () => {
    expect(contractAlert("2026-03-05", "2026-03-01")).toBe(7) // 4 days
    expect(contractAlert("2026-03-13", "2026-03-01")).toBe(14) // 12 days
    expect(contractAlert("2026-03-25", "2026-03-01")).toBe(30) // 24 days
    expect(contractAlert("2026-04-20", "2026-03-01")).toBe(60) // 50 days
  })

  it("returns null when far out and 'expired' once past", () => {
    expect(contractAlert("2026-12-31", "2026-03-01")).toBeNull()
    expect(contractAlert("2026-02-01", "2026-03-01")).toBe("expired")
  })

  it("never alerts on a permanent contract (no end date)", () => {
    expect(contractAlert(null, "2026-03-01")).toBeNull()
  })
})
