import { describe, it, expect } from "vitest"
import {
  outstanding,
  isOpenPayable,
  agePayables,
  outflowCalendar,
  type PayableLike,
} from "@/lib/finance/ap-aging"

const NOW = Date.parse("2026-07-02T00:00:00Z")

function p(o: Partial<PayableLike> & { dueDate: string }): PayableLike {
  return { status: "received", amount: 100, taxAmount: 0, paidAmount: 0, ...o }
}

describe("outstanding", () => {
  it("is gross (amount + tax) minus paid, floored at zero", () => {
    expect(outstanding({ amount: 100, taxAmount: 19, paidAmount: 0 })).toBe(119)
    expect(outstanding({ amount: 100, taxAmount: 19, paidAmount: 50 })).toBe(69)
    expect(outstanding({ amount: 100, taxAmount: 0, paidAmount: 200 })).toBe(0)
  })
})

describe("isOpenPayable", () => {
  it("is closed when paid, cancelled, or fully settled", () => {
    expect(isOpenPayable(p({ dueDate: "2026-07-01", status: "paid" }))).toBe(false)
    expect(isOpenPayable(p({ dueDate: "2026-07-01", status: "cancelled" }))).toBe(false)
    expect(isOpenPayable(p({ dueDate: "2026-07-01", amount: 100, paidAmount: 100 }))).toBe(false)
    expect(isOpenPayable(p({ dueDate: "2026-07-01" }))).toBe(true)
  })
})

describe("agePayables", () => {
  it("buckets open payables by days overdue and totals outstanding + overdue", () => {
    const items = [
      p({ dueDate: "2026-08-01", amount: 1000 }), // not yet due → current
      p({ dueDate: "2026-06-20", amount: 500 }), // 12d overdue → 1-30
      p({ dueDate: "2026-05-20", amount: 300 }), // ~43d → 31-60
      p({ dueDate: "2026-01-01", amount: 200 }), // >90 → 90+
      p({ dueDate: "2026-06-01", amount: 999, status: "paid" }), // excluded
    ]
    const r = agePayables(items, NOW)
    const byKey = Object.fromEntries(r.buckets.map((b) => [b.key, b]))
    expect(byKey.current!.total).toBe(1000)
    expect(byKey["1-30"]!.total).toBe(500)
    expect(byKey["31-60"]!.total).toBe(300)
    expect(byKey["90+"]!.total).toBe(200)
    expect(r.totalOutstanding).toBe(2000)
    expect(r.overdueTotal).toBe(1000) // everything except the not-yet-due 1000
    expect(r.openCount).toBe(4)
  })
})

describe("outflowCalendar", () => {
  it("groups upcoming payables by pay date and pulls overdue onto today", () => {
    const items = [
      { ...p({ dueDate: "2026-06-25", amount: 400 }) }, // overdue → today
      { ...p({ dueDate: "2026-07-10", amount: 600 }) }, // within window
      { ...p({ dueDate: "2026-09-01", amount: 900 }) }, // beyond 30d → excluded
      { ...p({ dueDate: "2026-07-05", amount: 100 }), scheduledDate: "2026-07-20" }, // scheduled overrides
    ]
    const cal = outflowCalendar(items, NOW, 30)
    const byDate = Object.fromEntries(cal.map((d) => [d.date, d.total]))
    expect(byDate["2026-07-02"]).toBe(400) // overdue collapsed to today
    expect(byDate["2026-07-10"]).toBe(600)
    expect(byDate["2026-07-20"]).toBe(100) // scheduled date wins
    expect(byDate["2026-09-01"]).toBeUndefined()
    // ascending order
    expect(cal.map((d) => d.date)).toEqual([...cal.map((d) => d.date)].sort())
  })
})
