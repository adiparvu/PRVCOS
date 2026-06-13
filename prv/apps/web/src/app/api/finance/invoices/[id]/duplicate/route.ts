import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, invoiceItems } from "@prv/db/schema"
import { eq, and, isNull, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const POST = withGates(
  { action: "finance.invoices.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session
    const id = req.nextUrl.pathname.split("/").at(-2)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [original] = await db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.id, id), eq(invoices.companyId, companyId), isNull(invoices.deletedAt))
      )
      .limit(1)

    if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const originalItems = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id))
      .orderBy(invoiceItems.sortOrder)

    // New invoice number: same year, next sequence
    const issueDate = new Date().toISOString().slice(0, 10)
    const year = issueDate.slice(0, 4)
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(invoices)
      .where(eq(invoices.companyId, companyId))
    const seq = String((cnt ?? 0) + 1).padStart(4, "0")
    const invoiceNumber = `PRV-${year}-${seq}`

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    const [created] = await db
      .insert(invoices)
      .values({
        companyId,
        clientId: original.clientId,
        projectId: original.projectId,
        createdByUserId: userId,
        invoiceNumber,
        status: "draft",
        issueDate,
        dueDate: dueDate.toISOString().slice(0, 10),
        subtotal: original.subtotal,
        vatAmount: original.vatAmount,
        total: original.total,
        currency: original.currency,
        notes: original.notes,
      })
      .returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })

    if (!created) return NextResponse.json({ error: "Duplicate failed" }, { status: 500 })

    if (originalItems.length > 0) {
      await db.insert(invoiceItems).values(
        originalItems.map((item, idx) => ({
          invoiceId: created.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          total: item.total,
          sortOrder: idx,
        }))
      )
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "finance.invoices.duplicate",
      entityType: "invoice",
      entityId: created.id,
      payload: { sourceId: id, invoiceNumber },
      method: "POST",
      path: `/api/finance/invoices/${id}/duplicate`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ invoice: created }, { status: 201 })
  }
)
