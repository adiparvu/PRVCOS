import { describe, it, expect } from "vitest"
import { computeDemandForecast } from "@/lib/demand-forecast"

function inp(
  productId: string,
  name: string,
  unitsSold: number,
  currentStock: number,
  opts: { reorderPoint?: number | null; minimum?: number; costPrice?: number } = {}
) {
  return {
    productId,
    name,
    unitsSold,
    currentStock,
    reorderPoint: opts.reorderPoint ?? null,
    minimum: opts.minimum ?? 0,
    costPrice: opts.costPrice ?? 0,
  }
}

describe("computeDemandForecast", () => {
  it("derives velocity, days-of-cover and projected demand over the horizon", () => {
    // 90 sold / 90 days = 1/day. 30 on hand → 30 days cover. 30d demand = 30.
    const f = computeDemandForecast([inp("a", "Tap", 90, 30)], 90, 30)
    const a = f.products[0]!
    expect(a.dailyVelocity).toBe(1)
    expect(a.daysOfCover).toBe(30)
    expect(a.projectedDemand).toBe(30)
  })

  it("flags critical when at/below the reorder point or under a week of cover", () => {
    // velocity 2/day, 6 on hand → 3 days cover → critical
    const f = computeDemandForecast(
      [inp("a", "Tap", 180, 6, { reorderPoint: 10, costPrice: 5 })],
      90,
      30
    )
    const a = f.products[0]!
    expect(a.band).toBe("critical")
    // suggested = projectedDemand(60) + reorderPoint(10) - stock(6) = 64
    expect(a.projectedDemand).toBe(60)
    expect(a.suggestedReorderQty).toBe(64)
    expect(a.suggestedReorderValue).toBe(320)
    expect(f.criticalCount).toBe(1)
  })

  it("flags reorder when cover runs out within the horizon but not critically", () => {
    // velocity 1/day, 20 on hand → 20 days cover (< 30 horizon, > 7) → reorder
    const f = computeDemandForecast([inp("a", "Tap", 90, 20, { reorderPoint: 5 })], 90, 30)
    const a = f.products[0]!
    expect(a.band).toBe("reorder")
    expect(a.suggestedReorderQty).toBe(30 + 5 - 20) // 15
    expect(f.reorderCount).toBe(1)
  })

  it("marks non-selling stock as overstock with no order", () => {
    const f = computeDemandForecast([inp("a", "Slab", 0, 40, { costPrice: 100 })], 90, 30)
    const a = f.products[0]!
    expect(a.daysOfCover).toBeNull()
    expect(a.band).toBe("overstock")
    expect(a.suggestedReorderQty).toBe(0)
  })

  it("marks very high cover as overstock and adequate cover as healthy", () => {
    const over = computeDemandForecast([inp("a", "A", 90, 400)], 90, 30).products[0]! // 400 days cover
    expect(over.band).toBe("overstock")
    const healthy = computeDemandForecast([inp("b", "B", 90, 60, { reorderPoint: 5 })], 90, 30)
      .products[0]! // 60 days cover
    expect(healthy.band).toBe("healthy")
    expect(healthy.suggestedReorderQty).toBe(0)
  })

  it("falls back to the minimum when no reorder point is set, and ranks urgent first", () => {
    const f = computeDemandForecast(
      [
        inp("healthy", "Healthy", 90, 90, { reorderPoint: 5 }), // 90d cover
        inp("crit", "Crit", 180, 4, { minimum: 8 }), // 2d cover, below min → critical
        inp("reorder", "Reorder", 90, 18, { reorderPoint: 5 }), // 18d cover
      ],
      90,
      30
    )
    expect(f.products.map((p) => p.productId)).toEqual(["crit", "reorder", "healthy"])
    expect(f.products[0]!.reorderPoint).toBe(8) // used minimum
    expect(f.totalSuggestedUnits).toBe(f.products.reduce((s, p) => s + p.suggestedReorderQty, 0))
  })

  it("clamps negative and non-finite inputs", () => {
    const f = computeDemandForecast(
      [inp("a", "A", Number.NaN, -10, { costPrice: -5, minimum: -3 })],
      90,
      30
    )
    const a = f.products[0]!
    expect(a.currentStock).toBe(0)
    expect(a.dailyVelocity).toBe(0)
    expect(a.suggestedReorderValue).toBe(0)
  })
})
