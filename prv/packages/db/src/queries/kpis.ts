import { sql, eq, and, gte, lt, isNull, inArray } from "drizzle-orm"
import { db } from "../client"
import { invoices, projects, companyMemberships, notifications } from "../schema"

export interface CompanyKpis {
  revenue: string // numeric string, RON
  activeProjects: number
  workforce: number
  alerts: number
  periodKey: string // "YYYY-MM"
}

/**
 * Aggregates the four Command-Center KPIs for a company.
 * Caller is responsible for caching — this function always hits the DB.
 */
export async function queryCompanyKpis(companyId: string, userId: string): Promise<CompanyKpis> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const [revenueRow, projectsRow, workforceRow, alertsRow] = await Promise.all([
    db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.total}), 0)::text` })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, companyId),
          eq(invoices.status, "paid"),
          gte(invoices.paidAt, startOfMonth),
          lt(invoices.paidAt, startOfNextMonth)
        )
      ),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(projects)
      .where(
        and(
          eq(projects.companyId, companyId),
          eq(projects.status, "active"),
          eq(projects.isActive, true),
          isNull(projects.deletedAt)
        )
      ),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(companyMemberships)
      .where(
        and(eq(companyMemberships.companyId, companyId), eq(companyMemberships.status, "ACTIVE"))
      ),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.companyId, companyId),
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          eq(notifications.isDismissed, false),
          inArray(notifications.type, ["error", "warning", "action_required"])
        )
      ),
  ])

  return {
    revenue: revenueRow[0]?.total ?? "0",
    activeProjects: projectsRow[0]?.count ?? 0,
    workforce: workforceRow[0]?.count ?? 0,
    alerts: alertsRow[0]?.count ?? 0,
    periodKey,
  }
}
