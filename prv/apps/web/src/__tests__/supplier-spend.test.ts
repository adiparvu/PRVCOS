import { describe, it, expect } from "vitest"
import { computeSupplierSpend } from "@/lib/supplier-spend"

const NOW = Date.parse("2026-07-06T00:00:00.000Z")
const day = (d: number) => new Date(NOW + d * 86_400_000).toISOString().slice(0, 10)

function inv(
  supplierId: string | null,
  status: "received" | "scheduled" | "paid" | "cancelled",
  amount: number,
  opts: { paidAmount?: number; dueDate?: string | null; name?: string } = {}
) {
  return {
    supplierId,
    supplierName: opts.name ?? `Supplier ${supplierId}`,
    status,
    dueDate: opts.dueDate ?? day(30),
    amount,
    paidAmount: opts.paidAmount ?? 0,
  }
}

describe("computeSupplierSpend", () => {
  it("returns zeros for no invoices", () => {
    const s = computeSupplierSpend([], NOW)
    expect(s.totalSpend).toBe(0)
    expect(s.supplierCount).toBe(0)
  })

  it("sums committed spend per supplier, excluding cancelled", () => {
    const s = computeSupplierSpend(
      [inv("a", "paid", 1000), inv("a", "received", 500), inv("a", "cancelled", 9999)],
      NOW
    )
    expect(s.suppliers[0]!.spend).toBe(1500)
    expect(s.suppliers[0]!.invoices).toBe(2)
    expect(s.totalSpend).toBe(1500)
  })

  it("counts outstanding as the unpaid portion of received/scheduled", () => {
    const s = computeSupplierSpend(
      [inv("a", "received", 1000, { paidAmount: 400 }), inv("a", "paid", 500, { paidAmount: 500 })],
      NOW
    )
    expect(s.suppliers[0]!.outstanding).toBe(600)
    expect(s.totalOutstanding).toBe(600)
  })

  it("flags overdue payables past their due date", () => {
    const s = computeSupplierSpend(
      [
        inv("a", "received", 1000, { dueDate: day(-5) }), // overdue
        inv("a", "scheduled", 500, { dueDate: day(10) }), // not yet due
      ],
      NOW
    )
    expect(s.suppliers[0]!.overdueAmount).toBe(1000)
    expect(s.suppliers[0]!.overdueCount).toBe(1)
    expect(s.totalOverdue).toBe(1000)
    expect(s.overdueSuppliers).toBe(1)
  })

  it("does not count a fully-paid or cancelled invoice as overdue", () => {
    const s = computeSupplierSpend(
      [
        inv("a", "paid", 1000, { paidAmount: 1000, dueDate: day(-5) }),
        inv("a", "cancelled", 500, { dueDate: day(-5) }),
      ],
      NOW
    )
    expect(s.suppliers[0]!.overdueAmount).toBe(0)
    expect(s.totalOverdue).toBe(0)
  })

  it("ranks suppliers by spend and buckets null supplier under unassigned", () => {
    const s = computeSupplierSpend(
      [inv("a", "paid", 100), inv("b", "paid", 900), inv(null, "received", 300)],
      NOW
    )
    expect(s.suppliers.map((v) => v.supplierId)).toEqual(["b", "unassigned", "a"])
  })
})
