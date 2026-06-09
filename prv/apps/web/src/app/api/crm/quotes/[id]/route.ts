import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, invoiceItems, clients, projects } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"
import type { QuoteSummary, QuoteStatus } from "../route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export type ApprovalStepStatus = "approved" | "pending" | "waiting" | "rejected"
export type QuoteActivityType =
  | "created"
  | "updated"
  | "sent"
  | "approved"
  | "rejected"
  | "accepted"
  | "converted"

export interface QuoteLineItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
}

export interface ApprovalStep {
  id: string
  actorName: string
  actorRole: string
  status: ApprovalStepStatus
  decidedAt: string | null
}

export interface QuoteActivity {
  id: string
  type: QuoteActivityType
  text: string
  timestamp: string
  actor?: string
}

export interface QuoteDetail extends QuoteSummary {
  clientContactName: string
  clientPhone: string
  clientEmail: string
  vatRate: number
  subtotal: number
  vatAmount: number
  lineItems: QuoteLineItem[]
  approvalChain: ApprovalStep[]
  activities: QuoteActivity[]
  notes: string | null
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "--").toUpperCase()
  return ((parts[0]?.[0] ?? "-") + (parts[parts.length - 1]?.[0] ?? "-")).toUpperCase()
}

export const GET = withGates(
  { action: "crm.quotes.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId } = ctx.session

    const [invoiceRows, itemRows] = await Promise.all([
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          subtotal: invoices.subtotal,
          vatAmount: invoices.vatAmount,
          total: invoices.total,
          notes: invoices.notes,
          createdAt: invoices.createdAt,
          clientId: invoices.clientId,
          clientName: clients.name,
          clientEmail: clients.email,
          clientPhone: clients.phone,
          projectName: projects.name,
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .leftJoin(projects, eq(invoices.projectId, projects.id))
        .where(
          and(eq(invoices.id, id), eq(invoices.companyId, companyId), isNull(invoices.deletedAt))
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
        })
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, id))
        .orderBy(asc(invoiceItems.sortOrder)),
    ])

    const row = invoiceRows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const apiStatus = dbStatusToQuote(row.status, row.dueDate)
    const clientName = row.clientName ?? "—"
    const vatRate = itemRows.length > 0 ? Number(itemRows[0]?.vatRate ?? 19) : 19

    const lineItems: QuoteLineItem[] = itemRows.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
    }))

    const activities: QuoteActivity[] = [
      {
        id: "ac-created",
        type: "created",
        text: `Ofertă ${row.invoiceNumber} creată`,
        timestamp: row.createdAt.toISOString(),
      },
    ]
    if (row.status === "sent") {
      activities.push({
        id: "ac-sent",
        type: "sent",
        text: "Ofertă trimisă clientului",
        timestamp: row.createdAt.toISOString(),
      })
    }

    const quote: QuoteDetail = {
      id: row.id,
      ref: row.invoiceNumber,
      clientId: row.clientId ?? "",
      clientName,
      clientInitials: initials(clientName),
      clientContactName: clientName,
      clientPhone: row.clientPhone ?? "—",
      clientEmail: row.clientEmail ?? "—",
      status: apiStatus,
      amount: Number(row.total),
      issuedDate: row.issueDate,
      expiryDate: row.dueDate,
      daysUntilExpiry: daysUntil(row.dueDate),
      projectName: row.projectName ?? "—",
      version: "v1.0",
      vatRate,
      subtotal: Number(row.subtotal),
      vatAmount: Number(row.vatAmount),
      lineItems,
      approvalChain: [],
      activities,
      notes: row.notes ?? null,
    }

    return NextResponse.json({ quote })
  }
)
