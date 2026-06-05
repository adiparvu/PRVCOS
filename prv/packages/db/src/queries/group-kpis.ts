import { sql, eq, and, gte, lt, isNull, inArray } from "drizzle-orm"
import { db } from "../client"
import { invoices, projects, companyMemberships, notifications, groupMemberships } from "../schema"

export interface GroupKpis {
  totalRevenue: string
  totalActiveProjects: number
  totalActiveEmployees: number
  totalOpenAlerts: number
  companiesIncluded: number
  periodKey: string
}

export async function queryGroupKpis(groupId: string, userId: string): Promise<GroupKpis> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  // Collect active company IDs for the group
  const members = await db
    .select({ companyId: groupMemberships.companyId })
    .from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.isActive, true)))

  const companyIds = members.map((m) => m.companyId)

  if (companyIds.length === 0) {
    return {
      totalRevenue: "0",
      totalActiveProjects: 0,
      totalActiveEmployees: 0,
      totalOpenAlerts: 0,
      companiesIncluded: 0,
      periodKey,
    }
  }

  const [revenueRow, projectsRow, workforceRow, alertsRow] = await Promise.all([
    db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.total}), 0)::text` })
      .from(invoices)
      .where(
        and(
          inArray(invoices.companyId, companyIds),
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
          inArray(projects.companyId, companyIds),
          eq(projects.status, "active"),
          eq(projects.isActive, true),
          isNull(projects.deletedAt)
        )
      ),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(companyMemberships)
      .where(
        and(
          inArray(companyMemberships.companyId, companyIds),
          eq(companyMemberships.status, "ACTIVE")
        )
      ),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(
        and(
          inArray(notifications.companyId, companyIds),
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          eq(notifications.isDismissed, false),
          inArray(notifications.type, ["error", "warning", "action_required"])
        )
      ),
  ])

  return {
    totalRevenue: revenueRow[0]?.total ?? "0",
    totalActiveProjects: projectsRow[0]?.count ?? 0,
    totalActiveEmployees: workforceRow[0]?.count ?? 0,
    totalOpenAlerts: alertsRow[0]?.count ?? 0,
    companiesIncluded: companyIds.length,
    periodKey,
  }
}
