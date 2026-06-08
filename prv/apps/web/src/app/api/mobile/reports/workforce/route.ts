import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { users, projectMilestones, projects } from "@prv/db/schema"
import { eq, and, gte, isNull, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [totalRow, activeRow, recentlyActiveRows, roleRows, tasksRow] = await Promise.all([
    // Total users
    db
      .select({ count: sql<string>`COUNT(*)` })
      .from(users)
      .where(and(eq(users.companyId, ctx.companyId), isNull(users.deletedAt))),

    // Active users
    db
      .select({ count: sql<string>`COUNT(*)` })
      .from(users)
      .where(
        and(eq(users.companyId, ctx.companyId), eq(users.status, "active"), isNull(users.deletedAt))
      ),

    // Recently active (last 30 days) — top 6
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
        role: users.role,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(
        and(
          eq(users.companyId, ctx.companyId),
          eq(users.status, "active"),
          isNull(users.deletedAt),
          gte(users.lastLoginAt, thirtyDaysAgo)
        )
      )
      .orderBy(sql`${users.lastLoginAt} DESC`)
      .limit(6),

    // Users by role (top roles)
    db
      .select({
        role: users.role,
        count: sql<string>`COUNT(*)`,
      })
      .from(users)
      .where(
        and(eq(users.companyId, ctx.companyId), eq(users.status, "active"), isNull(users.deletedAt))
      )
      .groupBy(users.role)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(6),

    // Tasks completed this month
    db
      .select({
        total: sql<string>`COUNT(*)`,
        completedMtd: sql<string>`SUM(CASE WHEN ${projectMilestones.isComplete} AND ${projectMilestones.completedAt} >= ${monthStart} THEN 1 ELSE 0 END)`,
        complete: sql<string>`SUM(CASE WHEN ${projectMilestones.isComplete} THEN 1 ELSE 0 END)`,
      })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(and(eq(projects.companyId, ctx.companyId), isNull(projects.deletedAt))),
  ])

  const totalUsers = parseInt(totalRow[0]?.count ?? "0")
  const activeUsers = parseInt(activeRow[0]?.count ?? "0")
  const recentlyActiveCount = recentlyActiveRows.length

  const tasksTotal = parseInt(tasksRow[0]?.total ?? "0")
  const tasksComplete = parseInt(tasksRow[0]?.complete ?? "0")
  const tasksCompletedMtd = parseInt(tasksRow[0]?.completedMtd ?? "0")
  const taskCompletionRate = tasksTotal > 0 ? Math.round((tasksComplete / tasksTotal) * 100) : 0

  const ROLE_LABELS: Record<string, string> = {
    worker: "Worker",
    team_leader: "Team Leader",
    oms: "OMS",
    operations_manager: "Ops Manager",
    project_worker: "Project Worker",
    project_team_leader: "Project Lead",
    project_director: "Project Director",
    seller: "Seller",
    store_manager: "Store Manager",
    shop_director: "Shop Director",
    ceo: "CEO",
    co_ceo: "Co-CEO",
    hr_payroll: "HR",
    data_analyst: "Analyst",
    system_administrator: "System Admin",
  }

  const byRole = roleRows.map((r) => ({
    role: r.role,
    label: ROLE_LABELS[r.role] ?? r.role,
    count: parseInt(r.count),
  }))

  return NextResponse.json({
    kpi: {
      totalUsers,
      activeUsers,
      recentlyActiveCount,
      tasksTotal,
      tasksComplete,
      tasksCompletedMtd,
      taskCompletionRate,
    },
    byRole,
    recentlyActive: recentlyActiveRows.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      jobTitle: u.jobTitle,
      role: u.role,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    })),
  })
})
