import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, clients, projects } from "@prv/db/schema"
import { eq, and, isNull, desc } from "drizzle-orm"

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

function toUiStatus(dbStatus: string, dueDate: string): InvoiceStatus {
  if (dbStatus === "paid") return "paid"
  if (dbStatus === "cancelled") return "void"
  if (dbStatus === "refunded") return "partial"
  if (dbStatus === "overdue") return "overdue"
  if (dbStatus === "draft") return "draft"
  // "sent" — compare dueDate against today
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

export const GET = withGates(
  { action: "finance.invoices.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const filterStatus = searchParams.get("status") as InvoiceStatus | null

    const rows = await db
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
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .where(and(eq(invoices.companyId, ctx.session.companyId), isNull(invoices.deletedAt)))
      .orderBy(desc(invoices.dueDate))

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

    return NextResponse.json({ invoices: list, count: list.length })
  }
)
