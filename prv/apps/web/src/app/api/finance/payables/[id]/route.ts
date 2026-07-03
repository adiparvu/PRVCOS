import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { supplierInvoices } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { outstanding } from "@/lib/finance/ap-aging"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function id(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("schedule"), scheduledDate: isoDate }),
  z.object({
    action: z.literal("pay"),
    amount: z.number().positive().max(1_000_000_000),
    paidDate: isoDate.optional(),
  }),
  z.object({ action: z.literal("cancel") }),
])

// PATCH /api/finance/payables/[id] — schedule a payment date, record a payment
// (full or partial), or cancel the payable.
export const PATCH = withGates(
  { action: "finance.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const [current] = await db
      .select({
        amount: supplierInvoices.amount,
        taxAmount: supplierInvoices.taxAmount,
        paidAmount: supplierInvoices.paidAmount,
        status: supplierInvoices.status,
      })
      .from(supplierInvoices)
      .where(and(eq(supplierInvoices.id, rowId), eq(supplierInvoices.companyId, companyId)))
      .limit(1)
    if (!current) return NextResponse.json({ error: "Payable not found" }, { status: 404 })
    if (current.status === "cancelled") {
      return NextResponse.json(
        { error: "Payable is cancelled", code: "CANCELLED" },
        { status: 409 }
      )
    }

    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (d.action === "schedule") {
      update.scheduledDate = d.scheduledDate
      update.status = "scheduled"
    } else if (d.action === "cancel") {
      update.status = "cancelled"
    } else {
      const amount = Number(current.amount)
      const taxAmount = Number(current.taxAmount)
      const prevPaid = Number(current.paidAmount)
      const newPaid = Math.round((prevPaid + d.amount) * 100) / 100
      update.paidAmount = newPaid.toFixed(2)
      const remaining = outstanding({ amount, taxAmount, paidAmount: newPaid })
      if (remaining <= 0) {
        update.status = "paid"
        update.paidDate = d.paidDate ?? new Date().toISOString().slice(0, 10)
      }
    }

    const [updated] = await db
      .update(supplierInvoices)
      .set(update)
      .where(and(eq(supplierInvoices.id, rowId), eq(supplierInvoices.companyId, companyId)))
      .returning({
        id: supplierInvoices.id,
        status: supplierInvoices.status,
        paidAmount: supplierInvoices.paidAmount,
      })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: `finance.payable.${d.action}`,
      entityType: "supplier_invoice",
      entityId: rowId,
      payload: d,
      method: "PATCH",
      path: `/api/finance/payables/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({
      id: updated?.id,
      status: updated?.status,
      paidAmount: Number(updated?.paidAmount ?? 0),
    })
  }
)
