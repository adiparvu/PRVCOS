import { describe, it, expect } from "vitest"
import { computeHealthScore, bandFor } from "@/lib/customer-health"

describe("computeHealthScore", () => {
  it("scores a dormant, zero-signal customer near the floor", () => {
    const h = computeHealthScore({
      ltv: 0,
      activeProjects: 0,
      openQuotes: 0,
      recentActivityCount: 0,
      daysSinceLastTouch: null,
    })
    expect(h.score).toBe(0)
    expect(h.band).toBe("dormant")
  })

  it("caps the value component at the ceiling (VIP-grade LTV)", () => {
    const h = computeHealthScore({
      ltv: 100_000, // well above the 30k ceiling
      activeProjects: 0,
      openQuotes: 0,
      recentActivityCount: 0,
      daysSinceLastTouch: 8,
    })
    expect(h.value).toBe(45)
    // 45 value + 0 engagement + 14 recency (8 days → ≤30 tier)
    expect(h.score).toBe(59)
    expect(h.band).toBe("healthy")
  })

  it("caps engagement at 35 and rewards recent touches", () => {
    const h = computeHealthScore({
      ltv: 30_000, // full 45 value
      activeProjects: 3, // 30
      openQuotes: 2, // 10
      recentActivityCount: 5, // 15 → total 55, capped to 35
      daysSinceLastTouch: 3, // 20
    })
    expect(h.value).toBe(45)
    expect(h.engagement).toBe(35)
    expect(h.recency).toBe(20)
    expect(h.score).toBe(100)
    expect(h.band).toBe("vip")
  })

  it("decays recency across the day tiers", () => {
    const base = { ltv: 0, activeProjects: 0, openQuotes: 0, recentActivityCount: 0 }
    expect(computeHealthScore({ ...base, daysSinceLastTouch: 5 }).recency).toBe(20)
    expect(computeHealthScore({ ...base, daysSinceLastTouch: 20 }).recency).toBe(14)
    expect(computeHealthScore({ ...base, daysSinceLastTouch: 60 }).recency).toBe(8)
    expect(computeHealthScore({ ...base, daysSinceLastTouch: 120 }).recency).toBe(3)
    expect(computeHealthScore({ ...base, daysSinceLastTouch: 400 }).recency).toBe(0)
  })

  it("clamps negative signals to zero", () => {
    const h = computeHealthScore({
      ltv: -5000,
      activeProjects: -2,
      openQuotes: -1,
      recentActivityCount: -3,
      daysSinceLastTouch: null,
    })
    expect(h.score).toBe(0)
  })

  it("maps score ranges to bands", () => {
    expect(bandFor(80)).toBe("vip")
    expect(bandFor(75)).toBe("vip")
    expect(bandFor(60)).toBe("healthy")
    expect(bandFor(30)).toBe("at_risk")
    expect(bandFor(10)).toBe("dormant")
  })
})
