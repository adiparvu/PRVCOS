import { describe, it, expect } from "vitest"
import { buildGroupHealth, bandForScore } from "@/lib/group-health"

describe("bandForScore", () => {
  it("maps scores to Phase 16.2 bands", () => {
    expect(bandForScore(95)).toBe("excellent")
    expect(bandForScore(84)).toBe("good")
    expect(bandForScore(58)).toBe("attention")
    expect(bandForScore(40)).toBe("critical")
  })
})

describe("buildGroupHealth", () => {
  it("computes score, delta, trend and band per company", () => {
    const g = buildGroupHealth([
      { companyId: "a", name: "Renovations", latestScore: 84, previousScore: 81 },
      { companyId: "b", name: "Shop", latestScore: 58, previousScore: 64 },
    ])
    const a = g.companies.find((c) => c.companyId === "a")!
    expect(a.score).toBe(84)
    expect(a.delta).toBe(3)
    expect(a.trend).toBe("up")
    expect(a.band).toBe("good")
    const b = g.companies.find((c) => c.companyId === "b")!
    expect(b.delta).toBe(-6)
    expect(b.trend).toBe("down")
    expect(b.band).toBe("attention")
  })

  it("sorts worst score first and no-data companies last", () => {
    const g = buildGroupHealth([
      { companyId: "good", name: "Good", latestScore: 90, previousScore: 90 },
      { companyId: "none", name: "New Co", latestScore: null, previousScore: null },
      { companyId: "bad", name: "Bad", latestScore: 45, previousScore: 50 },
    ])
    expect(g.companies.map((c) => c.companyId)).toEqual(["bad", "good", "none"])
    expect(g.companies[2]!.band).toBeNull()
  })

  it("averages only reporting companies and bands the average", () => {
    const g = buildGroupHealth([
      { companyId: "a", name: "A", latestScore: 80, previousScore: 80 },
      { companyId: "b", name: "B", latestScore: 60, previousScore: 60 },
      { companyId: "c", name: "C", latestScore: null, previousScore: null },
    ])
    expect(g.averageScore).toBe(70) // (80+60)/2, C excluded
    expect(g.band).toBe("good")
    expect(g.reporting).toBe(2)
    expect(g.total).toBe(3)
  })

  it("has no delta when there is no previous snapshot", () => {
    const g = buildGroupHealth([
      { companyId: "a", name: "A", latestScore: 72, previousScore: null },
    ])
    expect(g.companies[0]!.delta).toBe(0)
    expect(g.companies[0]!.trend).toBe("flat")
  })

  it("returns null average for an all-empty group", () => {
    const g = buildGroupHealth([
      { companyId: "a", name: "A", latestScore: null, previousScore: null },
    ])
    expect(g.averageScore).toBeNull()
    expect(g.band).toBeNull()
    expect(g.reporting).toBe(0)
  })

  it("clamps out-of-range and non-finite scores", () => {
    const g = buildGroupHealth([
      { companyId: "a", name: "A", latestScore: 140, previousScore: -10 },
      { companyId: "b", name: "B", latestScore: Number.NaN, previousScore: 50 },
    ])
    expect(g.companies.find((c) => c.companyId === "a")!.score).toBe(100)
    expect(g.companies.find((c) => c.companyId === "b")!.score).toBeNull()
  })
})
