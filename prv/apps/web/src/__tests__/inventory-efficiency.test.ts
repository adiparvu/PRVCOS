import { describe, it, expect } from "vitest"
import { computeInventoryEfficiency } from "@/lib/inventory-efficiency"

describe("computeInventoryEfficiency", () => {
  it("computes inventory value, cogs, annualized turnover and days-on-hand", () => {
    // 90-day window → annualize ×(365/90)≈4.056. 50 sold / 25 on hand = 2 → ×4.056 = 8.11.
    const eff = computeInventoryEfficiency(
      [{ productId: "a", name: "Tap", unitsSold: 50, currentStock: 25, costPrice: 10 }],
      90
    )
    const a = eff.products[0]!
    expect(a.inventoryValue).toBe(250)
    expect(a.cogs).toBe(500)
    expect(a.turnover).toBe(8.11)
    expect(a.daysOnHand).toBe(45)
    expect(a.band).toBe("fast")
  })

  it("bands slow, healthy and fast movers by annualized turnover", () => {
    // window = 365 days → annualize ×1, so turnover = unitsSold/currentStock.
    const eff = computeInventoryEfficiency(
      [
        { productId: "slow", name: "Slow", unitsSold: 10, currentStock: 100, costPrice: 5 }, // 0.1×
        { productId: "healthy", name: "Healthy", unitsSold: 40, currentStock: 10, costPrice: 5 }, // 4×
        { productId: "fast", name: "Fast", unitsSold: 80, currentStock: 10, costPrice: 5 }, // 8×
      ],
      365
    )
    const byId = Object.fromEntries(eff.products.map((p) => [p.productId, p]))
    expect(byId.slow!.band).toBe("slow")
    expect(byId.healthy!.band).toBe("healthy")
    expect(byId.fast!.band).toBe("fast")
    expect(eff.slowCount).toBe(1)
  })

  it("flags stock on hand with zero sales as dead capital", () => {
    const eff = computeInventoryEfficiency(
      [
        { productId: "dead", name: "Dead", unitsSold: 0, currentStock: 20, costPrice: 100 },
        { productId: "live", name: "Live", unitsSold: 30, currentStock: 10, costPrice: 50 },
      ],
      365
    )
    const dead = eff.products.find((p) => p.productId === "dead")!
    expect(dead.band).toBe("dead")
    expect(dead.turnover).toBe(0)
    expect(dead.daysOnHand).toBeNull()
    expect(eff.deadCount).toBe(1)
    expect(eff.deadStockValue).toBe(2000)
    // dead stock is ranked first (worst capital problem)
    expect(eff.products[0]!.productId).toBe("dead")
  })

  it("rolls up portfolio value, cogs and overall turnover", () => {
    const eff = computeInventoryEfficiency(
      [
        { productId: "a", name: "A", unitsSold: 20, currentStock: 10, costPrice: 100 }, // val 1000, cogs 2000
        { productId: "b", name: "B", unitsSold: 5, currentStock: 10, costPrice: 100 }, // val 1000, cogs 500
      ],
      365
    )
    expect(eff.totalInventoryValue).toBe(2000)
    expect(eff.totalCogs).toBe(2500)
    expect(eff.overallTurnover).toBe(1.25)
  })

  it("treats a product with no stock and no sales as healthy with null turnover", () => {
    const eff = computeInventoryEfficiency(
      [{ productId: "a", name: "A", unitsSold: 0, currentStock: 0, costPrice: 50 }],
      90
    )
    expect(eff.products[0]!.turnover).toBeNull()
    expect(eff.products[0]!.band).toBe("healthy")
    expect(eff.overallTurnover).toBeNull()
  })

  it("clamps negative and non-finite inputs", () => {
    const eff = computeInventoryEfficiency(
      [{ productId: "a", name: "A", unitsSold: Number.NaN, currentStock: -5, costPrice: -10 }],
      90
    )
    const a = eff.products[0]!
    expect(a.unitsSold).toBe(0)
    expect(a.currentStock).toBe(0)
    expect(a.costPrice).toBe(0)
    expect(a.inventoryValue).toBe(0)
  })
})
