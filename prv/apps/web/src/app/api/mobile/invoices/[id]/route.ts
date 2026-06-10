import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { invoices, invoiceItems, projects, clients, stores, users } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
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

const patchSchema = z.object({
  status: z.enum(["sent", "paid", "cancelled"]),
})

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const invoiceId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!invoiceId) {
    return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { status } = parsed.data

  const [existing] = await db
    .select({ id: invoices.id, status: invoices.status })
    .from(invoices)
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.companyId, ctx.companyId),
        isNull(invoices.deletedAt)
      )
    )
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  const updateValues: Record<string, unknown> = { status }
  if (status === "paid") {
    updateValues.paidAt = new Date()
  }

  const [updated] = await db
    .update(invoices)
    .set(updateValues)
    .where(eq(invoices.id, invoiceId))
    .returning({ id: invoices.id, status: invoices.status })

  if (!updated) {
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 })
  }

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.invoice.status_update",
    entityType: "invoice",
    entityId: invoiceId,
    method: "PATCH",
    path: `/api/mobile/invoices/${invoiceId}`,
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
    payload: { from: existing.status, to: status },
  })

  return NextResponse.json({ id: updated.id, status: updated.status })
})

// ─── DELETE /api/mobile/invoices/[id] ────────────────────────────────────────

export const DELETE = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const invoiceId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!invoiceId) return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 })

  const [existing] = await db
    .select({ id: invoices.id, status: invoices.status })
    .from(invoices)
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.companyId, ctx.companyId),
        isNull(invoices.deletedAt)
      )
    )
    .limit(1)

  if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

  if (!["draft", "cancelled"].includes(existing.status))
    return NextResponse.json(
      { error: `Cannot delete an invoice with status '${existing.status}'` },
      { status: 409 }
    )

  await db
    .update(invoices)
    .set({ deletedAt: new Date() })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.companyId, ctx.companyId)))

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.invoice.delete",
    entityType: "invoice",
    entityId: invoiceId,
    method: "DELETE",
    path: `/api/mobile/invoices/${invoiceId}`,
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
    payload: {},
  })

  return new NextResponse(null, { status: 204 })
})
