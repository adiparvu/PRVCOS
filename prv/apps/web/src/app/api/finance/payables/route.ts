import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { supplierInvoices, suppliers } from "@prv/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import {
  agePayables,
  outflowCalendar,
  outstanding,
  isOpenPayable,
  type AgingReport,
  type OutflowDay,
  type PayableStatus,
} from "@/lib/finance/ap-aging"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface PayableRow {
  id: string
  invoiceNumber: string
  supplierId: string | null
  supplierName: string | null
  status: PayableStatus
  issueDate: string | null
  dueDate: string
  scheduledDate: string | null
  paidDate: string | null
  amount: number
  taxAmount: number
  paidAmount: number
  outstanding: number
  currency: string
  overdue: boolean
  createdAt: string
}

export interface PayablesResponse {
  payables: PayableRow[]
  aging: AgingReport
  outflow: OutflowDay[]
  meta: { total: number; open: number; scheduled: number }
}

function num(v: string | null): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

// GET /api/finance/payables — the AP register + aging report + cash-outflow calendar.
export const GET = withGates(
  { action: "finance.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select({
        id: supplierInvoices.id,
        invoiceNumber: supplierInvoices.invoiceNumber,
        supplierId: supplierInvoices.supplierId,
        supplierName: suppliers.name,
        status: supplierInvoices.status,
        issueDate: supplierInvoices.issueDate,
        dueDate: supplierInvoices.dueDate,
        scheduledDate: supplierInvoices.scheduledDate,
        paidDate: supplierInvoices.paidDate,
        amount: supplierInvoices.amount,
        taxAmount: supplierInvoices.taxAmount,
        paidAmount: supplierInvoices.paidAmount,
        currency: supplierInvoices.currency,
        createdAt: supplierInvoices.createdAt,
      })
      .from(supplierInvoices)
      .leftJoin(suppliers, eq(supplierInvoices.supplierId, suppliers.id))
      .where(eq(supplierInvoices.companyId, ctx.session.companyId))
      .orderBy(desc(supplierInvoices.dueDate))

    const now = Date.now()
    const nowMs = new Date(new Date(now).toISOString().slice(0, 10) + "T00:00:00Z").getTime()

    const payables: PayableRow[] = rows.map((r) => {
      const amount = num(r.amount)
      const taxAmount = num(r.taxAmount)
      const paidAmount = num(r.paidAmount)
      const owed = outstanding({ amount, taxAmount, paidAmount })
      const status = r.status as PayableStatus
      const overdue =
        isOpenPayable({ status, dueDate: r.dueDate, amount, taxAmount, paidAmount }) &&
        Date.parse(r.dueDate + "T00:00:00Z") < nowMs
      return {
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        supplierId: r.supplierId,
        supplierName: r.supplierName,
        status,
        issueDate: r.issueDate,
        dueDate: r.dueDate,
        scheduledDate: r.scheduledDate,
        paidDate: r.paidDate,
        amount,
        taxAmount,
        paidAmount,
        outstanding: owed,
        currency: r.currency,
        overdue,
        createdAt: r.createdAt.toISOString(),
      }
    })

    const likes = payables.map((p) => ({
      status: p.status,
      dueDate: p.dueDate,
      scheduledDate: p.scheduledDate,
      amount: p.amount,
      taxAmount: p.taxAmount,
      paidAmount: p.paidAmount,
    }))
    const aging = agePayables(likes, nowMs)
    const outflow = outflowCalendar(likes, nowMs, 30)

    return NextResponse.json({
      payables,
      aging,
      outflow,
      meta: {
        total: payables.length,
        open: payables.filter((p) => p.status === "received").length,
        scheduled: payables.filter((p) => p.status === "scheduled").length,
      },
    })
  }
)

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const postSchema = z.object({
  supplierId: z.string().uuid().nullable().optional(),
  purchaseOrderId: z.string().uuid().nullable().optional(),
  invoiceNumber: z.string().min(1).max(60),
  issueDate: isoDate.nullable().optional(),
  dueDate: isoDate,
  amount: z.number().min(0).max(1_000_000_000),
  taxAmount: z.number().min(0).max(1_000_000_000).default(0),
  currency: z.string().length(3).default("RON"),
  notes: z.string().max(2000).nullable().optional(),
})

// POST /api/finance/payables — record a received supplier invoice.
export const POST = withGates(
  { action: "finance.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = postSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const [record] = await db
      .insert(supplierInvoices)
      .values({
        companyId,
        supplierId: d.supplierId ?? null,
        purchaseOrderId: d.purchaseOrderId ?? null,
        invoiceNumber: d.invoiceNumber,
        issueDate: d.issueDate ?? null,
        dueDate: d.dueDate,
        amount: d.amount.toFixed(2),
        taxAmount: d.taxAmount.toFixed(2),
        currency: d.currency,
        notes: d.notes ?? null,
        createdById: actorId,
      })
      .returning({ id: supplierInvoices.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "finance.payable.create",
      entityType: "supplier_invoice",
      entityId: record?.id ?? d.invoiceNumber,
      payload: { invoiceNumber: d.invoiceNumber, amount: d.amount, dueDate: d.dueDate },
      method: "POST",
      path: "/api/finance/payables",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
