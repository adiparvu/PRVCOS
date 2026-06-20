import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { invoices } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  method: z.enum(["bank_transfer", "cash", "card"]),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive().optional(),
  note: z.string().max(500).optional(),
})

const PAYABLE = ["sent", "overdue"] as const

export const POST = withGates(
  { action: "finance.invoices.payment.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").slice(-3, -2)[0]
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 }
      )

    const { method, paidDate, amount, note } = parsed.data
    const { userId, companyId, sessionId } = ctx.session

    const [existing] = await db
      .select({
        id: invoices.id,
        status: invoices.status,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
      })
      .from(invoices)
      .where(
        and(eq(invoices.id, id), eq(invoices.companyId, companyId), isNull(invoices.deletedAt))
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (existing.status === "paid")
      return NextResponse.json({ error: "Invoice is already paid" }, { status: 409 })
    if (!(PAYABLE as readonly string[]).includes(existing.status))
      return NextResponse.json(
        { error: `Cannot record payment for invoice with status '${existing.status}'` },
        { status: 409 }
      )

    const paidAt = new Date(paidDate)
    await db
      .update(invoices)
      .set({
        status: "paid",
        paidAt,
        notes: note ?? null,
        metadata: { paymentMethod: method, recordedAmount: amount ?? Number(existing.total) },
      })
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)))

    void writeAuditLog({
      actorId: userId,
      companyId,
      sessionId,
      action: "finance.invoice.payment",
      entityType: "invoice",
      entityId: id,
      payload: { method, paidDate, amount: amount ?? null, invoiceNumber: existing.invoiceNumber },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ success: true, id, method, paidDate })
  }
)
