import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { projects, projectMilestones } from "@prv/db/schema"
import { eq, and, gte, isNull, lt, sql, count } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (_req: NextRequest, ctx) => {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [statusRows, milestonesRow, overdueRow, completedMtdRow, recentRows] = await Promise.all([
    // Project counts by status
    db
      .select({
        status: projects.status,
        count: sql<string>`COUNT(*)`,
      })
      .from(projects)
      .where(and(eq(projects.companyId, ctx.companyId), isNull(projects.deletedAt)))
      .groupBy(projects.status),

    // Milestone totals
    db
      .select({
        total: sql<string>`COUNT(*)`,
        complete: sql<string>`SUM(CASE WHEN ${projectMilestones.isComplete} THEN 1 ELSE 0 END)`,
      })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(and(eq(projects.companyId, ctx.companyId), isNull(projects.deletedAt))),

    // Overdue milestones (not complete, due date passed)
    db
      .select({ count: sql<string>`COUNT(*)` })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          isNull(projects.deletedAt),
          eq(projectMilestones.isComplete, false),
          lt(projectMilestones.dueDate, todayStr)
        )
      ),

    // Milestones completed this month
    db
      .select({ count: sql<string>`COUNT(*)` })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          isNull(projects.deletedAt),
          eq(projectMilestones.isComplete, true),
          gte(projectMilestones.completedAt, monthStart)
        )
      ),

    // Recent active projects
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        dueDate: projects.dueDate,
      })
      .from(projects)
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          isNull(projects.deletedAt),
          eq(projects.isActive, true)
        )
      )
      .orderBy(sql`${projects.updatedAt} DESC`)
      .limit(6),
  ])

  const totalProjects = statusRows.reduce((s, r) => s + parseInt(r.count), 0)
  const activeCount = parseInt(statusRows.find((r) => r.status === "active")?.count ?? "0")
  const completedCount = parseInt(statusRows.find((r) => r.status === "completed")?.count ?? "0")
  const onHoldCount = parseInt(statusRows.find((r) => r.status === "on_hold")?.count ?? "0")
  const draftCount = parseInt(statusRows.find((r) => r.status === "draft")?.count ?? "0")
  const cancelledCount = parseInt(statusRows.find((r) => r.status === "cancelled")?.count ?? "0")

  const milestonesTotal = parseInt(milestonesRow[0]?.total ?? "0")
  const milestonesComplete = parseInt(milestonesRow[0]?.complete ?? "0")
  const milestonesOverdue = parseInt(overdueRow[0]?.count ?? "0")
  const completedMtd = parseInt(completedMtdRow[0]?.count ?? "0")

  const completionRate =
    milestonesTotal > 0 ? Math.round((milestonesComplete / milestonesTotal) * 100) : 0

  const byStatus = [
    { status: "active", label: "Active", count: activeCount },
    { status: "on_hold", label: "On Hold", count: onHoldCount },
    { status: "draft", label: "Draft", count: draftCount },
    { status: "completed", label: "Completed", count: completedCount },
    { status: "cancelled", label: "Cancelled", count: cancelledCount },
  ]
    .filter((s) => s.count > 0)
    .map((s) => ({
      ...s,
      pct: totalProjects > 0 ? Math.round((s.count / totalProjects) * 100) : 0,
    }))

  return NextResponse.json({
    kpi: {
      totalProjects,
      activeCount,
      completedCount,
      onHoldCount,
      milestonesTotal,
      milestonesComplete,
      milestonesOverdue,
      completedMtd,
      completionRate,
    },
    byStatus,
    recent: recentRows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      dueDate: r.dueDate,
    })),
  })
})
