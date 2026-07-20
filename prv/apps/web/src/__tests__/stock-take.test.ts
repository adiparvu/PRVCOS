import { describe, it, expect } from "vitest"
import { variance, summarizeStockTake, linesToPost } from "@/lib/stock-take"

describe("variance", () => {
  it("is counted minus system (surplus positive, shortage negative)", () => {
    expect(variance(10, 12)).toBe(2)
    expect(variance(10, 7)).toBe(-3)
    expect(variance(5, 5)).toBe(0)
  })
})

describe("summarizeStockTake", () => {
  it("aggregates discrepancies, direction, and variance totals", () => {
    const s = summarizeStockTake([
      { systemQty: 10, countedQty: 12 }, // +2 over
      { systemQty: 8, countedQty: 5 }, //  -3 under
      { systemQty: 4, countedQty: 4 }, //   0 match
      { systemQty: 0, countedQty: 1 }, //  +1 over
    ])
    expect(s.totalLines).toBe(4)
    expect(s.discrepancies).toBe(3)
    expect(s.overCount).toBe(2)
    expect(s.underCount).toBe(1)
    expect(s.netVariance).toBe(0) // +2 -3 +1
    expect(s.absVariance).toBe(6) // 2 + 3 + 1
  })
  it("is all-zero for an empty count", () => {
    expect(summarizeStockTake([])).toEqual({
      totalLines: 0,
      discrepancies: 0,
      overCount: 0,
      underCount: 0,
      netVariance: 0,
      absVariance: 0,
    })
  })
})

describe("linesToPost", () => {
  it("selects only discrepant, unposted lines", () => {
    const rows = [
      { id: "a", systemQty: 10, countedQty: 10, posted: false }, // match -> skip
      { id: "b", systemQty: 10, countedQty: 8, posted: false }, //  disc -> post
      { id: "c", systemQty: 5, countedQty: 9, posted: true }, //   already posted -> skip
    ]
    expect(linesToPost(rows).map((r) => r.id)).toEqual(["b"])
  })
})
