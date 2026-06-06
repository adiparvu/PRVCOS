import { sql, eq, and, gte, lt, inArray, isNull } from "drizzle-orm"
import { db } from "../client"
import {
  users,
  projects,
  projectMembers,
  notifications,
  invoices,
  companyMemberships,
} from "../schema"

// ── Manager KPIs ─────────────────────────────────────────────────────────────

export interface ManagerKpis {
  revenue: string
  workforce: number
  activeProjects: number
  alerts: number
  pendingApprovals: number
  periodKey: string
}

export async function queryManagerKpis(companyId: string, userId: string): Promise<ManagerKpis> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const [revenueRow, workforceRow, projectsRow, alertsRow, approvalsRow] = await Promise.all([
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
      .from(companyMemberships)
      .where(
        and(eq(companyMemberships.companyId, companyId), eq(companyMemberships.status, "ACTIVE"))
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
      .from(notifications)
      .where(
        and(
          eq(notifications.companyId, companyId),
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          eq(notifications.isDismissed, false),
          inArray(notifications.type, ["error", "warning"])
        )
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
          eq(notifications.type, "action_required")
        )
      ),
  ])

  return {
    revenue: revenueRow[0]?.total ?? "0",
    workforce: workforceRow[0]?.count ?? 0,
    activeProjects: projectsRow[0]?.count ?? 0,
    alerts: alertsRow[0]?.count ?? 0,
    pendingApprovals: approvalsRow[0]?.count ?? 0,
    periodKey,
  }
}

// ── Worker context ────────────────────────────────────────────────────────────

export interface WorkerContext {
  firstName: string
  lastName: string
  teamId: string | null
  storeId: string | null
  inboxCount: number
  activeProjectCount: number
}

export async function queryWorkerContext(
  userId: string,
  companyId: string
): Promise<WorkerContext> {
  const [userRow, inboxRow, projectRow] = await Promise.all([
    db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        teamId: users.teamId,
        storeId: users.storeId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.companyId, companyId),
          eq(notifications.isRead, false),
          eq(notifications.isDismissed, false)
        )
      ),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .where(
        and(
          eq(projectMembers.userId, userId),
          eq(projects.status, "active"),
          eq(projects.isActive, true),
          isNull(projects.deletedAt)
        )
      ),
  ])

  return {
    firstName: userRow[0]?.firstName ?? "there",
    lastName: userRow[0]?.lastName ?? "",
    teamId: userRow[0]?.teamId ?? null,
    storeId: userRow[0]?.storeId ?? null,
    inboxCount: inboxRow[0]?.count ?? 0,
    activeProjectCount: projectRow[0]?.count ?? 0,
  }
}

// ── Specialist context ────────────────────────────────────────────────────────

export interface SpecialistContext {
  firstName: string
  inboxCount: number
  alertCount: number
}

export async function querySpecialistContext(
  userId: string,
  companyId: string
): Promise<SpecialistContext> {
  const [userRow, inboxRow, alertRow] = await Promise.all([
    db.select({ firstName: users.firstName }).from(users).where(eq(users.id, userId)).limit(1),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.companyId, companyId),
          eq(notifications.isRead, false),
          eq(notifications.isDismissed, false)
        )
      ),

    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.companyId, companyId),
          eq(notifications.isRead, false),
          eq(notifications.isDismissed, false),
          inArray(notifications.type, ["error", "warning", "action_required"])
        )
      ),
  ])

  return {
    firstName: userRow[0]?.firstName ?? "there",
    inboxCount: inboxRow[0]?.count ?? 0,
    alertCount: alertRow[0]?.count ?? 0,
  }
}
