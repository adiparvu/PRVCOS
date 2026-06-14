import { NextRequest, NextResponse } from "next/server"
import { withPortalAuth } from "@/lib/portal-middleware"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { invoices, invoiceItems } from "@prv/db/schema"
import { and, asc, eq, isNull, notInArray } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withPortalAuth(
  async (req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    if (!ctx.clientId) {
      return NextResponse.json(
        { error: "No client profile linked to this account" },
        { status: 403 }
      )
    }

    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [invoiceRows, lineRows] = await Promise.all([
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          paidAt: invoices.paidAt,
          subtotal: invoices.subtotal,
          vatAmount: invoices.vatAmount,
          total: invoices.total,
          currency: invoices.currency,
          notes: invoices.notes,
          projectId: invoices.projectId,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.id, id),
            eq(invoices.companyId, ctx.companyId),
            eq(invoices.clientId, ctx.clientId),
            isNull(invoices.deletedAt),
            notInArray(invoices.status, ["draft"])
          )
        )
        .limit(1),

      db
        .select({
          id: invoiceItems.id,
          description: invoiceItems.description,
          quantity: invoiceItems.quantity,
          unit: invoiceItems.unit,
          unitPrice: invoiceItems.unitPrice,
          vatRate: invoiceItems.vatRate,
          total: invoiceItems.total,
          sortOrder: invoiceItems.sortOrder,
        })
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, id))
        .orderBy(asc(invoiceItems.sortOrder)),
    ])

    const row = invoiceRows[0]
    if (!row) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

    return NextResponse.json({
      invoice: {
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        status: row.status,
        issueDate: row.issueDate,
        dueDate: row.dueDate,
        paidAt: row.paidAt?.toISOString() ?? null,
        subtotal: Number(row.subtotal),
        vatAmount: Number(row.vatAmount),
        total: Number(row.total),
        currency: row.currency,
        notes: row.notes,
        projectId: row.projectId,
        createdAt: row.createdAt.toISOString(),
        lines: lineRows.map((l) => ({
          id: l.id,
          description: l.description,
          quantity: Number(l.quantity),
          unit: l.unit,
          unitPrice: Number(l.unitPrice),
          vatRate: Number(l.vatRate),
          total: Number(l.total),
          sortOrder: l.sortOrder,
        })),
      },
    })
  },
  { portalType: "client" }
)
