import { describe, it, expect } from "vitest"
import { computeDiscount, isPromotionRedeemable } from "@/lib/discount"

describe("discount", () => {
  it("computes percentage and fixed discounts", () => {
    expect(
      computeDiscount({ type: "percentage", value: 15, subtotal: 300, minSubtotal: 200 })
    ).toBe(45)
    expect(
      computeDiscount({ type: "fixed_amount", value: 50, subtotal: 300, minSubtotal: 0 })
    ).toBe(50)
    expect(
      computeDiscount({ type: "free_shipping", value: 0, subtotal: 300, minSubtotal: 0 })
    ).toBe(0)
  })

  it("returns 0 below the minimum spend and caps at the subtotal", () => {
    expect(
      computeDiscount({ type: "percentage", value: 15, subtotal: 100, minSubtotal: 200 })
    ).toBe(0)
    expect(
      computeDiscount({ type: "fixed_amount", value: 500, subtotal: 120, minSubtotal: 0 })
    ).toBe(120)
  })

  it("gauges redeemability by status, window and usage cap", () => {
    const base = { status: "active", startsAt: null, endsAt: null, usageLimit: null, usageCount: 0 }
    expect(isPromotionRedeemable(base, "2026-06-01")).toBe(true)
    expect(isPromotionRedeemable({ ...base, status: "paused" }, "2026-06-01")).toBe(false)
    expect(isPromotionRedeemable({ ...base, endsAt: "2026-05-31" }, "2026-06-01")).toBe(false)
    expect(isPromotionRedeemable({ ...base, startsAt: "2026-07-01" }, "2026-06-01")).toBe(false)
    expect(isPromotionRedeemable({ ...base, usageLimit: 10, usageCount: 10 }, "2026-06-01")).toBe(
      false
    )
  })
})
