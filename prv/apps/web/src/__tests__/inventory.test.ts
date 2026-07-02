import { describe, it, expect } from "vitest"
import { stockStatus, movementDelta, applyMovement } from "@/lib/inventory"

describe("inventory helpers", () => {
  it("bands stock status", () => {
    expect(stockStatus(0, 4, null)).toBe("out")
    expect(stockStatus(18, 10, 20)).toBe("reorder") // ≤ reorder point
    expect(stockStatus(9, 10, null)).toBe("low") // ≤ minimum
    expect(stockStatus(42, 8, 20)).toBe("ok")
  })

  it("computes signed movement deltas by type", () => {
    expect(movementDelta("receive", 40, 18)).toBe(40)
    expect(movementDelta("return", 5, 0)).toBe(5)
    expect(movementDelta("sale", 6, 48)).toBe(-6)
    expect(movementDelta("writeoff", 3, 12)).toBe(-3)
    expect(movementDelta("adjust", 3, 10)).toBe(-7) // set to 3
    expect(movementDelta("count", 25, 20)).toBe(5)
  })

  it("never drives a sale below zero", () => {
    expect(movementDelta("sale", 100, 5)).toBe(-5)
    expect(applyMovement("sale", 100, 5)).toEqual({ delta: -5, balanceAfter: 0 })
  })

  it("applies a movement to a new balance", () => {
    expect(applyMovement("receive", 40, 18)).toEqual({ delta: 40, balanceAfter: 58 })
  })
})
