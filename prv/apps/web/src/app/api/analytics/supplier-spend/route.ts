import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { supplierInvoices, suppliers } from "@prv/db/schema"
import { eq } from "drizzle-orm"
import { computeSupplierSpend, type SupplierSpend, type PayableStatus } from "@/lib/supplier-spend"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type SupplierSpendResponse = SupplierSpend

// GET /api/analytics/supplier-spend — per-supplier committed spend, outstanding
// balance and overdue payables from the supplier-invoice ledger.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        supplierId: supplierInvoices.supplierId,
        status: supplierInvoices.status,
        dueDate: supplierInvoices.dueDate,
        amount: supplierInvoices.amount,
        paidAmount: supplierInvoices.paidAmount,
        supplierName: suppliers.name,
      })
      .from(supplierInvoices)
      .leftJoin(suppliers, eq(supplierInvoices.supplierId, suppliers.id))
      .where(eq(supplierInvoices.companyId, ctx.session.companyId))

    const spend = computeSupplierSpend(
      rows.map((r) => ({
        supplierId: r.supplierId,
        supplierName: r.supplierName ?? "Unassigned",
        status: r.status as PayableStatus,
        dueDate: r.dueDate ? String(r.dueDate) : null,
        amount: Number(r.amount ?? 0),
        paidAmount: Number(r.paidAmount ?? 0),
      })),
      Date.now()
    )

    return NextResponse.json(spend)
  }
)
