import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import type { InvoiceSummary, InvoiceStatus } from "../route"
import { db } from "@prv/db"
import {
  invoices,
  invoiceItems,
  clients,
  clientContacts,
  projects,
  auditLogs,
} from "@prv/db/schema"
import { eq, and, isNull, desc } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type InvoicePaymentMethod = "bank_transfer" | "cash" | "card"
export type InvoiceActivityType = "created" | "sent" | "reminder" | "payment" | "overdue" | "voided"

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
}

export interface InvoiceActivity {
  id: string
  type: InvoiceActivityType
  text: string
  timestamp: string
  actor?: string
}

export interface InvoiceDetail extends InvoiceSummary {
  clientContactName: string
  clientPhone: string
  clientCif: string
  series: string
  vatRate: number
  subtotal: number
  vatAmount: number
  lineItems: InvoiceLineItem[]
  activities: InvoiceActivity[]
}

function toUiStatus(dbStatus: string, dueDate: string): InvoiceStatus {
  if (dbStatus === "paid") return "paid"
  if (dbStatus === "cancelled") return "void"
  if (dbStatus === "refunded") return "partial"
  if (dbStatus === "overdue") return "overdue"
  if (dbStatus === "draft") return "draft"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dueDate) < today ? "overdue" : "due"
}

function calcDaysOverdue(dueDate: string, status: InvoiceStatus): number | null {
  if (status !== "overdue") return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - new Date(dueDate).getTime()) / 86400000))
}

function nameInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

function actionToType(action: string): InvoiceActivityType {
  if (action.includes(".create")) return "created"
  if (action.includes(".send")) return "sent"
  if (action.includes(".payment") || action.includes(".pay")) return "payment"
  if (action.includes(".remind")) return "reminder"
  if (action.includes(".void") || action.includes(".cancel")) return "voided"
  if (action.includes(".overdue")) return "overdue"
  return "created"
}

function actionToText(action: string, ref: string): string {
  if (action.includes(".create")) return `Invoice ${ref} created`
  if (action.includes(".send")) return "Invoice sent to client"
  if (action.includes(".payment") || action.includes(".pay")) return "Payment recorded"
  if (action.includes(".remind")) return "Reminder sent to client"
  if (action.includes(".void") || action.includes(".cancel")) return "Invoice voided"
  if (action.includes(".overdue")) return "Invoice overdue — client notified"
  return action
}

export const GET = withGates(
  { action: "finance.invoices.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const rows = await db
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
        clientId: invoices.clientId,
        clientName: clients.name,
        clientVatNumber: clients.vatNumber,
        projectName: projects.name,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.companyId, ctx.session.companyId),
          isNull(invoices.deletedAt)
        )
      )
      .limit(1)

    const inv = rows[0]
    if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Parallel: line items + primary contact + audit activity
    const contactPromise: Promise<
      Array<{ firstName: string; lastName: string; phone: string | null }>
    > = inv.clientId
      ? db
          .select({
            firstName: clientContacts.firstName,
            lastName: clientContacts.lastName,
            phone: clientContacts.phone,
          })
          .from(clientContacts)
          .where(and(eq(clientContacts.clientId, inv.clientId), eq(clientContacts.isPrimary, true)))
          .limit(1)
      : Promise.resolve([])

    const [itemRows, contactRows, logRows] = await Promise.all([
      db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, id))
        .orderBy(invoiceItems.sortOrder),
      contactPromise,
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          actorId: auditLogs.actorId,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.companyId, ctx.session.companyId),
            eq(auditLogs.entityType, "invoice"),
            eq(auditLogs.entityId, id)
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(20),
    ])

    const uiStatus = toUiStatus(inv.status, inv.dueDate)
    const clientName = inv.clientName ?? "—"
    const primaryContact = contactRows[0]
    const contactName = primaryContact
      ? [primaryContact.firstName, primaryContact.lastName].filter(Boolean).join(" ")
      : "—"
    const issueYear = inv.issueDate.slice(0, 4)
    const firstItem = itemRows[0]

    const lineItems: InvoiceLineItem[] = itemRows.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
    }))

    const activities: InvoiceActivity[] = logRows.map((log) => ({
      id: log.id,
      type: actionToType(log.action),
      text: actionToText(log.action, inv.invoiceNumber),
      timestamp: log.createdAt.toISOString(),
    }))

    if (activities.length === 0) {
      activities.push({
        id: `${id}-created`,
        type: "created",
        text: `Invoice ${inv.invoiceNumber} created`,
        timestamp: `${inv.issueDate}T00:00:00Z`,
      })
    }

    const detail: InvoiceDetail = {
      id: inv.id,
      ref: inv.invoiceNumber,
      clientId: inv.clientId ?? "",
      clientName,
      clientInitials: nameInitials(clientName),
      clientContactName: contactName,
      clientPhone: primaryContact?.phone ?? "—",
      clientCif: inv.clientVatNumber ?? "—",
      status: uiStatus,
      series: `PRV-${issueYear}`,
      amount: Number(inv.total),
      amountPaid: inv.paidAt ? Number(inv.total) : 0,
      vatRate: Number(firstItem?.vatRate ?? "19"),
      subtotal: Number(inv.subtotal),
      vatAmount: Number(inv.vatAmount),
      dueDate: inv.dueDate,
      issuedDate: inv.issueDate,
      projectName: inv.projectName ?? "—",
      daysOverdue: calcDaysOverdue(inv.dueDate, uiStatus),
      lineItems,
      activities,
    }

    return NextResponse.json({ invoice: detail })
  }
)

// ─── PATCH /api/finance/invoices/[id] ────────────────────────────────────────

const patchInvoiceSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled", "refunded"]).optional(),
  notes: z.string().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  issueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  clientId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
})

export const PATCH = withGates(
  { action: "finance.invoices.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const companyId = ctx.session.companyId

    const [existing] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(eq(invoices.id, id), eq(invoices.companyId, companyId), isNull(invoices.deletedAt))
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { status, ...rest } = parsed.data

    const [updated] = await db
      .update(invoices)
      .set({
        ...rest,
        ...(status !== undefined ? { status } : {}),
        ...(status === "paid" ? { paidAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(eq(invoices.id, id), eq(invoices.companyId, companyId), isNull(invoices.deletedAt))
      )
      .returning({ id: invoices.id })

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "finance.invoices.update",
      entityType: "invoice",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: `/api/finance/invoices/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/finance/invoices/[id] ───────────────────────────────────────

export const DELETE = withGates(
  { action: "finance.invoices.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const companyId = ctx.session.companyId

    const [existing] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(eq(invoices.id, id), eq(invoices.companyId, companyId), isNull(invoices.deletedAt))
      )
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(invoices)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(invoices.id, id), eq(invoices.companyId, companyId), isNull(invoices.deletedAt))
      )

    void writeAuditLog({
      companyId,
      actorId: ctx.session.userId,
      sessionId: ctx.session.sessionId,
      action: "finance.invoices.delete",
      entityType: "invoice",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: `/api/finance/invoices/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
