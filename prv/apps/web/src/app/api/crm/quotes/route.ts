import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, invoiceItems, clients, projects } from "@prv/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired"

export interface QuoteSummary {
  id: string
  ref: string
  clientId: string
  clientName: string
  clientInitials: string
  status: QuoteStatus
  amount: number
  issuedDate: string
  expiryDate: string
  daysUntilExpiry: number | null
  projectName: string
  version: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "--").toUpperCase()
  return ((parts[0]?.[0] ?? "-") + (parts[parts.length - 1]?.[0] ?? "-")).toUpperCase()
}

function dbStatusToQuote(s: string, dueDate: string): QuoteStatus {
  if (s === "paid") return "accepted"
  if (s === "cancelled") return "rejected"
  if (s === "overdue" || s === "refunded") return "expired"
  if (s === "sent") return "sent"
  if (new Date(dueDate) < new Date()) return "expired"
  return "draft"
}

function daysUntil(dueDate: string): number | null {
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000)
  return diff >= 0 ? diff : null
}

export const GET = withGates(
  { action: "crm.quotes.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status") as QuoteStatus | null
    const clientIdFilter = searchParams.get("clientId")
    const { companyId } = ctx.session

    const conditions = [eq(invoices.companyId, companyId), isNull(invoices.deletedAt)]
    if (clientIdFilter) conditions.push(eq(invoices.clientId, clientIdFilter))

    const rows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        total: invoices.total,
        clientId: invoices.clientId,
        clientName: clients.name,
        projectName: projects.name,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))

    let quotes: QuoteSummary[] = rows.map((r) => {
      const clientName = r.clientName ?? "—"
      const apiStatus = dbStatusToQuote(r.status, r.dueDate)
      return {
        id: r.id,
        ref: r.invoiceNumber,
        clientId: r.clientId ?? "",
        clientName,
        clientInitials: initials(clientName),
        status: apiStatus,
        amount: Number(r.total),
        issuedDate: r.issueDate,
        expiryDate: r.dueDate,
        daysUntilExpiry: daysUntil(r.dueDate),
        projectName: r.projectName ?? "—",
        version: "v1.0",
      }
    })

    if (statusFilter) {
      quotes = quotes.filter((q) => q.status === statusFilter)
    }

    return NextResponse.json({ quotes, count: quotes.length })
  }
)

export const POST = withGates(
  { action: "crm.quotes.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const body = await req.json()
    const { clientId, projectId, items, validityDays, notes, status } = body

    const { companyId, userId } = ctx.session
    const today = new Date().toISOString().slice(0, 10)
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + (validityDays ?? 30))
    const expiryDate = expiry.toISOString().slice(0, 10)

    const lineItems = (items ?? []) as Array<{
      description: string
      quantity: number
      unit: string
      unitPrice: number
      taxRate?: number
    }>

    const subtotalNum = lineItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0)
    const vatRate = lineItems[0]?.taxRate ?? 19
    const vatAmount = Math.round(subtotalNum * (vatRate / 100) * 100) / 100
    const total = subtotalNum + vatAmount

    const ref = `Q-${Date.now()}`

    const [inserted] = await db
      .insert(invoices)
      .values({
        companyId,
        clientId: clientId ?? null,
        projectId: projectId ?? null,
        createdByUserId: userId,
        invoiceNumber: ref,
        status: (status ?? "draft") as
          | "draft"
          | "sent"
          | "paid"
          | "overdue"
          | "cancelled"
          | "refunded",
        issueDate: today,
        dueDate: expiryDate,
        subtotal: String(subtotalNum),
        vatAmount: String(vatAmount),
        total: String(total),
        notes: notes ?? null,
      })
      .returning()

    if (!inserted) return NextResponse.json({ error: "Database error" }, { status: 500 })

    if (lineItems.length > 0) {
      await db.insert(invoiceItems).values(
        lineItems.map((it, i) => ({
          invoiceId: inserted.id,
          description: it.description ?? "",
          quantity: String(it.quantity),
          unit: it.unit ?? "buc",
          unitPrice: String(it.unitPrice),
          vatRate: String(it.taxRate ?? 19),
          total: String(it.quantity * it.unitPrice),
          sortOrder: i,
        }))
      )
    }

    await writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "crm.quotes.create",
      entityType: "quote",
      entityId: inserted.id,
      payload: {
        clientId,
        itemCount: lineItems.length,
        totalAmount: total,
        status: inserted.status,
      },
    })

    const newQuote: QuoteSummary = {
      id: inserted.id,
      ref: inserted.invoiceNumber,
      clientId: inserted.clientId ?? "",
      clientName: "",
      clientInitials: "",
      status: dbStatusToQuote(inserted.status, inserted.dueDate),
      amount: Number(inserted.total),
      issuedDate: inserted.issueDate,
      expiryDate: inserted.dueDate,
      daysUntilExpiry: validityDays ?? 30,
      projectName: "",
      version: "v1.0",
    }

    return NextResponse.json({ quote: newQuote }, { status: 201 })
  }
)
