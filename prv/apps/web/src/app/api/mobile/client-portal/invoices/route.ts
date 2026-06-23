import { NextRequest, NextResponse } from "next/server"
import { withPortalMobileAuth } from "@/lib/mobile/portal-auth"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import { invoices, projects } from "@prv/db/schema"
import { and, desc, eq, isNull, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function formatEuro(value: string | number | null | undefined): string {
  if (value == null) return "€0.00"
  const n = Number(value)
  return `€${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function statusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Draft"
    case "sent":
      return "Sent"
    case "paid":
      return "Paid"
    case "overdue":
      return "Overdue"
    case "cancelled":
      return "Cancelled"
    case "refunded":
      return "Refunded"
    default:
      return status
  }
}

export const GET = withPortalMobileAuth(
  async (req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    if (!ctx.clientId) {
      return NextResponse.json(
        { error: "No client profile linked to this account" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get("status")

    const conditions = [
      eq(invoices.companyId, ctx.companyId),
      eq(invoices.clientId, ctx.clientId),
      isNull(invoices.deletedAt),
    ]

    if (statusFilter) {
      conditions.push(eq(invoices.status, statusFilter as typeof invoices.status._.data))
    }

    const rows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        total: invoices.total,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
        projectName: projects.name,
      })
      .from(invoices)
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(100)

    // Compute summary totals
    const [sums] = await db
      .select({
        total: sql<string>`coalesce(sum(total), 0)`,
        pending: sql<string>`coalesce(sum(case when status in ('sent','overdue') then total else 0 end), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.clientId, ctx.clientId),
          isNull(invoices.deletedAt)
        )
      )

    const invoiceList = rows.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      status: r.status as "draft" | "sent" | "paid" | "overdue" | "cancelled",
      statusLabel: statusLabel(r.status),
      total: formatEuro(r.total),
      issueDate:
        typeof r.issueDate === "string"
          ? r.issueDate
          : (r.issueDate as Date).toISOString().split("T")[0]!,
      dueDate: r.dueDate
        ? typeof r.dueDate === "string"
          ? r.dueDate
          : (r.dueDate as Date).toISOString().split("T")[0]!
        : null,
      paidDate: r.paidAt ? r.paidAt.toISOString().split("T")[0]! : null,
      projectName: r.projectName ?? null,
    }))

    return NextResponse.json({
      invoices: invoiceList,
      summary: {
        total: formatEuro(sums?.total),
        pending: formatEuro(sums?.pending),
      },
    })
  },
  { portalType: "client" }
)
