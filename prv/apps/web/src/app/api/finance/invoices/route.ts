import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, invoiceItems, clients, projects } from "@prv/db/schema"
import { eq, and, isNull, desc, lt, sql } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type InvoiceStatus = "overdue" | "due" | "partial" | "paid" | "draft" | "void"

export interface InvoiceSummary {
  id: string
  ref: string
  clientId: string
  clientName: string
  clientInitials: string
  status: InvoiceStatus
  amount: number
  amountPaid: number
  dueDate: string
  issuedDate: string
  projectName: string
  daysOverdue: number | null
}

export function toUiStatus(dbStatus: string, dueDate: string): InvoiceStatus {
  if (dbStatus === "paid") return "paid"
  if (dbStatus === "cancelled") return "void"
  if (dbStatus === "refunded") return "partial"
  if (dbStatus === "overdue") return "overdue"
  if (dbStatus === "draft") return "draft"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dueDate) < today ? "overdue" : "due"
}

export function calcDaysOverdue(dueDate: string, status: InvoiceStatus): number | null {
  if (status !== "overdue") return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - new Date(dueDate).getTime()) / 86400000))
}

export function nameInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export const GET = withGates(
  { action: "finance.invoices.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const filterStatus = searchParams.get("status") as InvoiceStatus | null
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200)

    const conditions = [eq(invoices.companyId, ctx.session.companyId), isNull(invoices.deletedAt)]
    if (cursor) conditions.push(lt(invoices.createdAt, new Date(cursor)))

    const rawRows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        clientId: invoices.clientId,
        clientName: clients.name,
        status: invoices.status,
        dueDate: invoices.dueDate,
        issueDate: invoices.issueDate,
        paidAt: invoices.paidAt,
        total: invoices.total,
        projectName: projects.name,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(limit + 1)

    const hasMore = rawRows.length > limit
    const rows = hasMore ? rawRows.slice(0, limit) : rawRows
    const nextCursor =
      hasMore && rows.length > 0 ? rows[rows.length - 1]!.createdAt.toISOString() : null

    const list: InvoiceSummary[] = []
    for (const r of rows) {
      const clientName = r.clientName ?? "—"
      const uiStatus = toUiStatus(r.status, r.dueDate)
      if (filterStatus && uiStatus !== filterStatus) continue
      list.push({
        id: r.id,
        ref: r.invoiceNumber,
        clientId: r.clientId ?? "",
        clientName,
        clientInitials: nameInitials(clientName),
        status: uiStatus,
        amount: Number(r.total),
        amountPaid: r.paidAt ? Number(r.total) : 0,
        dueDate: r.dueDate,
        issuedDate: r.issueDate,
        projectName: r.projectName ?? "—",
        daysOverdue: calcDaysOverdue(r.dueDate, uiStatus),
      })
    }

    return NextResponse.json({ invoices: list, count: list.length, nextCursor })
  }
)

// ─── POST /api/finance/invoices ───────────────────────────────────────────────

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().default("buc"),
  unitPrice: z.number().nonnegative(),
  vatRate: z.number().min(0).max(100).default(19),
  productId: z.string().uuid().nullable().optional(),
})

const createInvoiceSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.enum(["RON", "EUR", "USD"]).default("RON"),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
})

export const POST = withGates(
  { action: "finance.invoices.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createInvoiceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { lineItems, currency, notes, clientId, projectId, issueDate, dueDate } = parsed.data

    // Generate invoice number: PRV-YYYY-NNNN
    const year = issueDate.slice(0, 4)
    const [{ cnt }] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(invoices)
      .where(eq(invoices.companyId, companyId))
    const seq = String((cnt ?? 0) + 1).padStart(4, "0")
    const invoiceNumber = `PRV-${year}-${seq}`

    // Compute totals
    let subtotal = 0
    let vatAmount = 0
    for (const item of lineItems) {
      const lineNet = item.quantity * item.unitPrice
      subtotal += lineNet
      vatAmount += lineNet * (item.vatRate / 100)
    }
    const total = subtotal + vatAmount

    const [created] = await db
      .insert(invoices)
      .values({
        companyId,
        clientId: clientId ?? null,
        projectId: projectId ?? null,
        createdByUserId: userId,
        invoiceNumber,
        status: "draft",
        issueDate,
        dueDate,
        subtotal: String(Math.round(subtotal * 100) / 100),
        vatAmount: String(Math.round(vatAmount * 100) / 100),
        total: String(Math.round(total * 100) / 100),
        currency,
        notes: notes ?? null,
      })
      .returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })

    if (!created) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    await db.insert(invoiceItems).values(
      lineItems.map((item, idx) => ({
        invoiceId: created.id,
        productId: item.productId ?? null,
        description: item.description,
        quantity: String(item.quantity),
        unit: item.unit,
        unitPrice: String(item.unitPrice),
        vatRate: String(item.vatRate),
        total: String(Math.round(item.quantity * item.unitPrice * 100) / 100),
        sortOrder: idx,
      }))
    )

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "finance.invoices.create",
      entityType: "invoice",
      entityId: created.id,
      payload: { invoiceNumber, lineCount: lineItems.length, total: Math.round(total) },
      method: "POST",
      path: "/api/finance/invoices",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ invoice: created }, { status: 201 })
  }
)
