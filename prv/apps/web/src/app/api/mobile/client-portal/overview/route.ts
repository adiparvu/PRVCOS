import { NextRequest, NextResponse } from "next/server"
import { withPortalMobileAuth } from "@/lib/mobile/portal-auth"
import type { PortalSessionContext } from "@/lib/portal-auth"
import { db } from "@prv/db"
import {
  portalAccounts,
  renovationProjects,
  renovationPhases,
  invoices,
  renovationSiteReports,
} from "@prv/db/schema"
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Format a number as a euro string: "€1,234.56" */
function formatEuro(value: string | number | null | undefined): string {
  if (value == null) return "€0.00"
  const n = Number(value)
  return `€${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Produce a relative time string from a Date, e.g. "2h ago", "3d ago" */
function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  const diffMo = Math.floor(diffDay / 30)
  return `${diffMo}mo ago`
}

/** Map renovation project status to the simplified set used by the mobile client portal */
function mapProjectStatus(status: string): "planning" | "in_progress" | "on_hold" | "completed" {
  switch (status) {
    case "inquiry":
    case "estimation":
    case "contracted":
      return "planning"
    case "in_progress":
      return "in_progress"
    case "paused":
      return "on_hold"
    case "completed":
      return "completed"
    default:
      return "planning"
  }
}

export const GET = withPortalMobileAuth(
  async (_req: NextRequest, ctx: PortalSessionContext): Promise<NextResponse> => {
    if (!ctx.clientId) {
      return NextResponse.json(
        { error: "No client profile linked to this account" },
        { status: 403 }
      )
    }

    // ── 1. Account / client info ─────────────────────────────────────────────
    const [account] = await db
      .select({
        name: portalAccounts.name,
        email: portalAccounts.email,
        createdAt: portalAccounts.createdAt,
      })
      .from(portalAccounts)
      .where(eq(portalAccounts.id, ctx.accountId))
      .limit(1)

    const nameParts = (account?.name ?? "").split(" ")
    const firstName = nameParts[0] ?? ""
    const lastName = nameParts.slice(1).join(" ")

    // ── 2. Active projects (in_progress / contracted) ────────────────────────
    const activeStatuses = ["in_progress", "contracted"] as const

    const activeProjects = await db
      .select({
        id: renovationProjects.id,
        title: renovationProjects.title,
        status: renovationProjects.status,
        completionPercentage: renovationProjects.completionPercentage,
        estimatedEndDate: renovationProjects.estimatedEndDate,
      })
      .from(renovationProjects)
      .where(
        and(
          eq(renovationProjects.companyId, ctx.companyId),
          eq(renovationProjects.clientId, ctx.clientId),
          isNull(renovationProjects.deletedAt),
          inArray(renovationProjects.status, [...activeStatuses])
        )
      )
      .orderBy(desc(renovationProjects.createdAt))
      .limit(3)

    // ── 3. KPIs ──────────────────────────────────────────────────────────────
    // Active project count (full count, not just top-3)
    const [activeCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(renovationProjects)
      .where(
        and(
          eq(renovationProjects.companyId, ctx.companyId),
          eq(renovationProjects.clientId, ctx.clientId),
          isNull(renovationProjects.deletedAt),
          inArray(renovationProjects.status, [...activeStatuses])
        )
      )

    // Pending invoices (sent + overdue)
    const pendingInvoiceRows = await db
      .select({
        id: invoices.id,
        total: invoices.total,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.clientId, ctx.clientId),
          isNull(invoices.deletedAt),
          inArray(invoices.status, ["sent", "overdue"])
        )
      )

    const pendingAmount = pendingInvoiceRows.reduce((sum, r) => sum + Number(r.total), 0)

    // Total paid
    const paidInvoiceRows = await db
      .select({ total: invoices.total })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.clientId, ctx.clientId),
          isNull(invoices.deletedAt),
          eq(invoices.status, "paid")
        )
      )

    const totalSpent = paidInvoiceRows.reduce((sum, r) => sum + Number(r.total), 0)

    // ── 4. Next milestone per active project ─────────────────────────────────
    let nextMilestoneMap: Record<string, string | null> = {}
    if (activeProjects.length > 0) {
      const projectIds = activeProjects.map((p) => p.id)
      // Get the earliest pending phase for each project
      const phaseRows = await db
        .select({
          projectId: renovationPhases.projectId,
          title: renovationPhases.title,
          plannedEndDate: renovationPhases.plannedEndDate,
        })
        .from(renovationPhases)
        .where(
          and(
            inArray(renovationPhases.projectId, projectIds),
            inArray(renovationPhases.status, ["pending", "in_progress"])
          )
        )
        .orderBy(renovationPhases.phaseNumber)

      // Take the first (lowest phaseNumber) per project
      for (const row of phaseRows) {
        if (!nextMilestoneMap[row.projectId]) {
          nextMilestoneMap[row.projectId] = row.title
        }
      }
    }

    // ── 5. Recent activity from site reports ─────────────────────────────────
    // We use client-visible site reports as activity items.
    const recentReports = await db
      .select({
        id: renovationSiteReports.id,
        projectId: renovationSiteReports.projectId,
        reportType: renovationSiteReports.reportType,
        workPerformed: renovationSiteReports.workPerformed,
        createdAt: renovationSiteReports.createdAt,
      })
      .from(renovationSiteReports)
      .innerJoin(
        renovationProjects,
        and(
          eq(renovationSiteReports.projectId, renovationProjects.id),
          eq(renovationProjects.clientId, ctx.clientId),
          eq(renovationProjects.companyId, ctx.companyId),
          isNull(renovationProjects.deletedAt)
        )
      )
      .where(eq(renovationSiteReports.clientVisible, true))
      .orderBy(desc(renovationSiteReports.createdAt))
      .limit(3)

    // Recent invoices as activity items
    const recentInvoices = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, ctx.companyId),
          eq(invoices.clientId, ctx.clientId),
          isNull(invoices.deletedAt),
          inArray(invoices.status, ["sent", "paid"])
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(2)

    // Merge and sort activity items by date, take top 5
    type ActivityItemFinal = {
      id: string
      type: "photo_uploaded" | "milestone_completed" | "invoice_sent" | "document_added" | "message"
      title: string
      subtitle: string
      timeAgo: string
    }
    type ActivityItemWithTs = ActivityItemFinal & { _ts: number }

    const activityItems: ActivityItemFinal[] = (
      [
        ...recentReports.map((r) => ({
          id: r.id,
          type: (r.reportType === "milestone"
            ? "milestone_completed"
            : "photo_uploaded") as ActivityItemFinal["type"],
          title:
            r.reportType === "milestone"
              ? "Milestone completed"
              : r.reportType === "inspection"
                ? "Inspection report added"
                : "Site update",
          subtitle: r.workPerformed
            ? r.workPerformed.slice(0, 80) + (r.workPerformed.length > 80 ? "…" : "")
            : "New site report available",
          timeAgo: timeAgo(r.createdAt),
          _ts: r.createdAt.getTime(),
        })),
        ...recentInvoices.map((inv) => ({
          id: inv.id,
          type: "invoice_sent" as ActivityItemFinal["type"],
          title: `Invoice ${inv.invoiceNumber}`,
          subtitle: `${formatEuro(inv.total)} — new invoice issued`,
          timeAgo: timeAgo(inv.createdAt),
          _ts: inv.createdAt.getTime(),
        })),
      ] as ActivityItemWithTs[]
    )
      .sort((a, b) => b._ts - a._ts)
      .slice(0, 5)
      .map(({ _ts: _unused, ...rest }) => rest)

    // ── 6. Shape response ────────────────────────────────────────────────────
    return NextResponse.json({
      client: {
        firstName,
        lastName,
        email: account?.email ?? ctx.email,
        avatarUrl: null,
        memberSince: account?.createdAt.toISOString() ?? new Date().toISOString(),
      },
      kpis: {
        activeProjects: activeCountRow?.count ?? 0,
        pendingInvoices: pendingInvoiceRows.length,
        pendingAmount: formatEuro(pendingAmount),
        totalSpent: formatEuro(totalSpent),
      },
      activeProjects: activeProjects.map((p) => ({
        id: p.id,
        name: p.title,
        status: mapProjectStatus(p.status),
        progress: p.completionPercentage,
        nextMilestone: nextMilestoneMap[p.id] ?? null,
        dueDate: p.estimatedEndDate ?? null,
      })),
      recentActivity: activityItems,
    })
  },
  { portalType: "client" }
)
