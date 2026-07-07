import { describe, it, expect } from "vitest"
import { computeExpenseBreakdown } from "@/lib/expense-breakdown"

const NOW = Date.parse("2026-07-15T00:00:00.000Z")

function exp(
  category: string,
  status: "draft" | "submitted" | "approved" | "rejected" | "paid",
  amount: number,
  date: string
) {
  return { category, status, amount, date }
}

describe("computeExpenseBreakdown", () => {
  it("returns zeros for no expenses", () => {
    const b = computeExpenseBreakdown([], NOW, 6)
    expect(b.totalSpend).toBe(0)
    expect(b.byCategory).toEqual([])
    expect(b.months).toHaveLength(6)
    expect(b.momChangePct).toBeNull()
  })

  it("counts committed spend as approved + paid, excluding draft/rejected/submitted", () => {
    const b = computeExpenseBreakdown(
      [
        exp("materials", "approved", 1000, "2026-07-01"),
        exp("labor", "paid", 500, "2026-07-01"),
        exp("rent", "submitted", 300, "2026-07-01"),
        exp("other", "draft", 200, "2026-07-01"),
        exp("other", "rejected", 999, "2026-07-01"),
      ],
      NOW,
      6
    )
    expect(b.totalSpend).toBe(1500)
    expect(b.paidAmount).toBe(500)
    expect(b.pendingAmount).toBe(300)
    expect(b.committedCount).toBe(2)
  })

  it("breaks committed spend down by category, largest first", () => {
    const b = computeExpenseBreakdown(
      [
        exp("materials", "approved", 800, "2026-07-01"),
        exp("materials", "paid", 400, "2026-07-01"),
        exp("labor", "approved", 900, "2026-07-01"),
      ],
      NOW,
      6
    )
    expect(b.byCategory[0]).toEqual({ category: "materials", amount: 1200 })
    expect(b.byCategory[1]).toEqual({ category: "labor", amount: 900 })
  })

  it("buckets committed spend into trailing months", () => {
    const b = computeExpenseBreakdown(
      [exp("materials", "paid", 500, "2026-07-05"), exp("labor", "approved", 300, "2026-06-10")],
      NOW,
      6
    )
    expect(b.months[5]!.amount).toBe(500) // July
    expect(b.months[4]!.amount).toBe(300) // June
    expect(b.months[5]!.label).toBe("Jul")
  })

  it("computes month-over-month change on committed spend", () => {
    const b = computeExpenseBreakdown(
      [
        exp("materials", "paid", 200, "2026-06-01"), // June 200
        exp("materials", "paid", 300, "2026-07-01"), // July 300
      ],
      NOW,
      6
    )
    expect(b.momChangePct).toBe(50)
  })
})
