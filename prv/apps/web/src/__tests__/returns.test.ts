import { describe, it, expect } from "vitest"
import { computeRefund, isValidReturnTransition, RETURN_TRANSITIONS } from "@/lib/returns"

describe("computeRefund", () => {
  it("sums quantity × unit price rounded to cents", () => {
    expect(
      computeRefund([
        { quantity: 2, unitPrice: 9.99 },
        { quantity: 1, unitPrice: 5.5 },
      ])
    ).toBe(25.48)
  })

  it("returns 0 for an empty basket", () => {
    expect(computeRefund([])).toBe(0)
  })

  it("clamps negative quantity/price to 0", () => {
    expect(computeRefund([{ quantity: -3, unitPrice: 10 }])).toBe(0)
    expect(computeRefund([{ quantity: 2, unitPrice: -10 }])).toBe(0)
  })

  it("rounds to two decimals rather than accumulating float drift", () => {
    expect(computeRefund([{ quantity: 3, unitPrice: 0.1 }])).toBe(0.3)
  })
})

describe("isValidReturnTransition", () => {
  it("allows the forward workflow steps", () => {
    expect(isValidReturnTransition("requested", "approved")).toBe(true)
    expect(isValidReturnTransition("approved", "received")).toBe(true)
    expect(isValidReturnTransition("received", "refunded")).toBe(true)
  })

  it("allows rejection from requested and approved", () => {
    expect(isValidReturnTransition("requested", "rejected")).toBe(true)
    expect(isValidReturnTransition("approved", "rejected")).toBe(true)
  })

  it("treats refunded and rejected as terminal", () => {
    expect(RETURN_TRANSITIONS.refunded).toEqual([])
    expect(RETURN_TRANSITIONS.rejected).toEqual([])
    expect(isValidReturnTransition("refunded", "approved")).toBe(false)
    expect(isValidReturnTransition("rejected", "approved")).toBe(false)
  })

  it("rejects skipping steps or unknown states", () => {
    expect(isValidReturnTransition("requested", "refunded")).toBe(false)
    expect(isValidReturnTransition("received", "rejected")).toBe(false)
    expect(isValidReturnTransition("bogus", "approved")).toBe(false)
  })
})
