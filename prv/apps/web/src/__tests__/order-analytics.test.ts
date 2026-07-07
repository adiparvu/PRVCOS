import { describe, it, expect } from "vitest"
import { computeOrderAnalytics } from "@/lib/order-analytics"

const NOW = Date.parse("2026-07-15T00:00:00.000Z")

function ord(status: string, total: number, iso = "2026-07-01T10:00:00Z") {
  return { status: status as never, total, createdAt: iso }
}

describe("computeOrderAnalytics", () => {
  it("returns zeros for no orders", () => {
    const a = computeOrderAnalytics([], NOW, 6)
    expect(a.totalOrders).toBe(0)
    expect(a.revenue).toBe(0)
    expect(a.aov).toBe(0)
    expect(a.fulfilledRatePct).toBeNull()
    expect(a.months).toHaveLength(6)
  })

  it("books revenue excluding cancelled and refunded orders", () => {
    const a = computeOrderAnalytics(
      [ord("delivered", 1000), ord("processing", 500), ord("cancelled", 900), ord("refunded", 400)],
      NOW,
      6
    )
    expect(a.revenue).toBe(1500)
    expect(a.aov).toBe(750) // 1500 / 2 booked
  })

  it("counts the status mix and fulfilled / cancel rates", () => {
    const a = computeOrderAnalytics(
      [ord("delivered", 100), ord("delivered", 100), ord("cancelled", 100), ord("pending", 100)],
      NOW,
      6
    )
    expect(a.byStatus.delivered).toBe(2)
    expect(a.delivered).toBe(2)
    expect(a.cancelledOrRefunded).toBe(1)
    expect(a.fulfilledRatePct).toBe(50) // 2 of 4
    expect(a.cancelRatePct).toBe(25) // 1 of 4
  })

  it("buckets booked revenue into trailing months", () => {
    const a = computeOrderAnalytics(
      [ord("delivered", 500, "2026-07-05T10:00:00Z"), ord("shipped", 300, "2026-06-10T10:00:00Z")],
      NOW,
      6
    )
    expect(a.months[5]!.revenue).toBe(500) // July
    expect(a.months[4]!.revenue).toBe(300) // June
  })

  it("computes month-over-month revenue change", () => {
    const a = computeOrderAnalytics(
      [
        ord("delivered", 200, "2026-06-01T10:00:00Z"),
        ord("delivered", 300, "2026-07-01T10:00:00Z"),
      ],
      NOW,
      6
    )
    expect(a.momChangePct).toBe(50)
  })
})
