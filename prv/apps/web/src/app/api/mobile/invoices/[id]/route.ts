import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { invoices, invoiceItems, projects, clients, stores, users } from "@prv/db/schema"
import { eq, and, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "RON" ? "RON " : currency === "EUR" ? "€" : `${currency} `
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(2)}k`
  return `${symbol}${amount.toFixed(2)}`
}

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const invoiceId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!invoiceId) {
    return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 })
  }

  const [invoiceRow] = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      subtotal: invoices.subtotal,
      vatAmount: invoices.vatAmount,
      total: invoices.total,
      currency: invoices.currency,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      paidAt: invoices.paidAt,
      notes: invoices.notes,
      clientId: invoices.clientId,
      projectId: invoices.projectId,
      orderId: invoices.orderId,
      createdByUserId: invoices.createdByUserId,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.companyId, ctx.companyId),
        isNull(invoices.deletedAt)
      )
    )
    .limit(1)

  if (!invoiceRow) {
    return NextResponse.json({ error: "Invoice not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const [itemRows, clientRow, projectRow, creatorRow] = await Promise.all([
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
      .where(eq(invoiceItems.invoiceId, invoiceId))
      .orderBy(invoiceItems.sortOrder),

    invoiceRow.clientId
      ? db
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(eq(clients.id, invoiceRow.clientId))
          .limit(1)
      : Promise.resolve([]),

    invoiceRow.projectId
      ? db
          .select({ id: projects.id, name: projects.name })
          .from(projects)
          .where(eq(projects.id, invoiceRow.projectId))
          .limit(1)
      : Promise.resolve([]),

    invoiceRow.createdByUserId
      ? db
          .select({ firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, invoiceRow.createdByUserId))
          .limit(1)
      : Promise.resolve([]),
  ])

  const currency = invoiceRow.currency

  return NextResponse.json({
    invoice: {
      id: invoiceRow.id,
      invoiceNumber: invoiceRow.invoiceNumber,
      status: invoiceRow.status,
      subtotal: formatCurrency(Number(invoiceRow.subtotal), currency),
      vatAmount: formatCurrency(Number(invoiceRow.vatAmount), currency),
      total: formatCurrency(Number(invoiceRow.total), currency),
      subtotalRaw: Number(invoiceRow.subtotal),
      vatAmountRaw: Number(invoiceRow.vatAmount),
      totalRaw: Number(invoiceRow.total),
      currency,
      issueDate: invoiceRow.issueDate,
      dueDate: invoiceRow.dueDate ?? null,
      paidAt: invoiceRow.paidAt ?? null,
      notes: invoiceRow.notes ?? null,
      orderId: invoiceRow.orderId ?? null,
    },
    client: clientRow[0] ? { id: clientRow[0].id, name: clientRow[0].name } : null,
    project: projectRow[0] ? { id: projectRow[0].id, name: projectRow[0].name } : null,
    createdBy: creatorRow[0]
      ? { name: `${creatorRow[0].firstName} ${creatorRow[0].lastName}` }
      : null,
    items: itemRows.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPrice: Number(item.unitPrice),
      unitPriceFormatted: formatCurrency(Number(item.unitPrice), currency),
      vatRate: Number(item.vatRate),
      total: Number(item.total),
      totalFormatted: formatCurrency(Number(item.total), currency),
    })),
  })
})
