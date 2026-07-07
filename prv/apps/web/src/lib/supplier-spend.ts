// Supplier spend & payables — Supplier Management analytics (roadmap Phase 21).
// Pure + unit-tested.
//
// Rolls supplier invoices up per supplier into committed spend, the unpaid
// balance outstanding, and the overdue payables (unpaid past their due date).
// On-time payment metrics are intentionally omitted — the payable schema has no
// paid-at timestamp, so a computed on-time rate would be guessed, not measured.

export type PayableStatus = "received" | "scheduled" | "paid" | "cancelled"

export interface SupplierInvoiceInput {
  supplierId: string | null
  supplierName: string
  status: PayableStatus
  dueDate: string | null // YYYY-MM-DD
  amount: number
  paidAmount: number
}

export interface SupplierRow {
  supplierId: string
  name: string
  spend: number // committed (invoiced, excluding cancelled)
  invoices: number
  outstanding: number // unpaid portion of received/scheduled
  overdueAmount: number // outstanding past due date
  overdueCount: number
}

export interface SupplierSpend {
  totalSpend: number
  totalOutstanding: number
  totalOverdue: number
  supplierCount: number
  overdueSuppliers: number
  suppliers: SupplierRow[] // by spend, largest first
}

const UNPAID: PayableStatus[] = ["received", "scheduled"]

function money(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
}

/** Aggregate supplier invoices into per-supplier spend & payables as of `nowMs`. */
export function computeSupplierSpend(
  invoices: SupplierInvoiceInput[],
  nowMs: number
): SupplierSpend {
  const nowDay = new Date(nowMs).toISOString().slice(0, 10)

  interface Acc {
    name: string
    spend: number
    invoices: number
    outstanding: number
    overdueAmount: number
    overdueCount: number
  }
  const byId = new Map<string, Acc>()

  for (const inv of invoices) {
    if (inv.status === "cancelled") continue
    const id = inv.supplierId ?? "unassigned"
    let a = byId.get(id)
    if (!a) {
      a = {
        name: inv.supplierName,
        spend: 0,
        invoices: 0,
        outstanding: 0,
        overdueAmount: 0,
        overdueCount: 0,
      }
      byId.set(id, a)
    }
    const amount = Math.max(0, money(inv.amount))
    const paid = Math.max(0, money(inv.paidAmount))
    a.spend += amount
    a.invoices += 1

    if (UNPAID.includes(inv.status)) {
      const unpaid = Math.max(0, amount - paid)
      a.outstanding += unpaid
      if (unpaid > 0 && inv.dueDate !== null && inv.dueDate < nowDay) {
        a.overdueAmount += unpaid
        a.overdueCount += 1
      }
    }
  }

  const suppliers: SupplierRow[] = [...byId.entries()]
    .map(([supplierId, a]) => ({
      supplierId,
      name: a.name,
      spend: money(a.spend),
      invoices: a.invoices,
      outstanding: money(a.outstanding),
      overdueAmount: money(a.overdueAmount),
      overdueCount: a.overdueCount,
    }))
    .sort((x, y) => y.spend - x.spend || x.name.localeCompare(y.name))

  return {
    totalSpend: money(suppliers.reduce((s, v) => s + v.spend, 0)),
    totalOutstanding: money(suppliers.reduce((s, v) => s + v.outstanding, 0)),
    totalOverdue: money(suppliers.reduce((s, v) => s + v.overdueAmount, 0)),
    supplierCount: suppliers.length,
    overdueSuppliers: suppliers.filter((v) => v.overdueAmount > 0).length,
    suppliers,
  }
}
