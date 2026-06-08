import { db } from "@prv/db"
import { projects, orders, clients, projectMilestones } from "@prv/db/schema"
import { eq, and, gte, lt, inArray, not, count, isNull, desc, sql } from "drizzle-orm"
import type { MobileContext } from "./auth"
import type { OperationsData, ProjectItem, OrderItem, TaskItem } from "./types"

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "RON"): string {
  const eur = currency === "EUR"
  const prefix = eur ? "€" : ""
  const suffix = eur ? "" : " RON"
  if (amount >= 1_000_000) return `${prefix}${(amount / 1_000_000).toFixed(1)}M${suffix}`
  if (amount >= 1_000) return `${prefix}${Math.round(amount / 1_000)}k${suffix}`
  return `${prefix}${Math.round(amount)}${suffix}`
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

// ─── Main assembly ────────────────────────────────────────────────────────────

export async function assembleOperations(ctx: MobileContext): Promise<OperationsData> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  const [
    projectRows,
    activeCountRow,
    onHoldCountRow,
    pipelineRow,
    ordersThisWeekRow,
    ordersPendingRow,
    ordersRevenueRow,
    ordersRefundedRow,
    recentOrders,
    openMilestonesRow,
    overdueMilestonesRow,
    doneTodayRow,
    openTaskList,
    doneTodayTaskList,
  ] = await Promise.all([
    // Projects: active + on_hold + completed (limit 10, newest first)
    db
      .select({
        id: projects.id,
        name: projects.name,
        clientName: clients.name,
        status: projects.status,
        budget: projects.budget,
        currency: projects.currency,
        dueDate: projects.dueDate,
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          inArray(projects.status, ["active", "on_hold", "completed"]),
          isNull(projects.deletedAt)
        )
      )
      .orderBy(desc(projects.createdAt))
      .limit(10),

    // Active project count
    db
      .select({ total: count() })
      .from(projects)
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          eq(projects.status, "active"),
          isNull(projects.deletedAt)
        )
      ),

    // On-hold project count
    db
      .select({ total: count() })
      .from(projects)
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          eq(projects.status, "on_hold"),
          isNull(projects.deletedAt)
        )
      ),

    // Pipeline: sum of budgets for active + on_hold
    db
      .select({ total: sql<string>`COALESCE(SUM(${projects.budget}), '0')` })
      .from(projects)
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          inArray(projects.status, ["active", "on_hold"]),
          isNull(projects.deletedAt)
        )
      ),

    // Orders count this week
    db
      .select({ total: count() })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, weekAgo),
          isNull(orders.deletedAt)
        )
      ),

    // Pending orders count
    db
      .select({ total: count() })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          eq(orders.status, "pending"),
          isNull(orders.deletedAt)
        )
      ),

    // Revenue this week (non-cancelled/refunded)
    db
      .select({ total: sql<string>`COALESCE(SUM(${orders.total}), '0')` })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, weekAgo),
          not(inArray(orders.status, ["cancelled", "refunded"])),
          isNull(orders.deletedAt)
        )
      ),

    // Refunded orders count this week
    db
      .select({ total: count() })
      .from(orders)
      .where(
        and(
          eq(orders.companyId, ctx.companyId),
          gte(orders.createdAt, weekAgo),
          eq(orders.status, "refunded"),
          isNull(orders.deletedAt)
        )
      ),

    // Recent orders (last 10)
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        total: orders.total,
        currency: orders.currency,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(eq(orders.companyId, ctx.companyId), isNull(orders.deletedAt)))
      .orderBy(desc(orders.createdAt))
      .limit(10),

    // Open milestones count (all active projects in company)
    db
      .select({ total: count() })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          eq(projectMilestones.isComplete, false),
          isNull(projects.deletedAt)
        )
      ),

    // Overdue milestones count
    db
      .select({ total: count() })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          eq(projectMilestones.isComplete, false),
          lt(projectMilestones.dueDate, sql`CURRENT_DATE`),
          isNull(projects.deletedAt)
        )
      ),

    // Milestones completed today count
    db
      .select({ total: count() })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          eq(projectMilestones.isComplete, true),
          gte(projectMilestones.completedAt, todayStart),
          lt(projectMilestones.completedAt, todayEnd),
          isNull(projects.deletedAt)
        )
      ),

    // Open milestones list (overdue first, then by due date)
    db
      .select({
        id: projectMilestones.id,
        title: projectMilestones.title,
        projectName: projects.name,
        dueDate: projectMilestones.dueDate,
        isComplete: projectMilestones.isComplete,
        completedAt: projectMilestones.completedAt,
      })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          eq(projectMilestones.isComplete, false),
          isNull(projects.deletedAt)
        )
      )
      .orderBy(projectMilestones.dueDate)
      .limit(12),

    // Milestones completed today (list)
    db
      .select({
        id: projectMilestones.id,
        title: projectMilestones.title,
        projectName: projects.name,
        dueDate: projectMilestones.dueDate,
        isComplete: projectMilestones.isComplete,
        completedAt: projectMilestones.completedAt,
      })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(
        and(
          eq(projects.companyId, ctx.companyId),
          eq(projectMilestones.isComplete, true),
          gte(projectMilestones.completedAt, todayStart),
          lt(projectMilestones.completedAt, todayEnd),
          isNull(projects.deletedAt)
        )
      )
      .orderBy(desc(projectMilestones.completedAt))
      .limit(5),
  ])

  // ── Milestone progress per project (sequential — needs project IDs) ──────────

  const projectIds = projectRows.map((p) => p.id)
  const milestoneStats =
    projectIds.length > 0
      ? await db
          .select({
            projectId: projectMilestones.projectId,
            total: count(),
            completed: sql<number>`SUM(CASE WHEN ${projectMilestones.isComplete} THEN 1 ELSE 0 END)::int`,
          })
          .from(projectMilestones)
          .where(inArray(projectMilestones.projectId, projectIds))
          .groupBy(projectMilestones.projectId)
      : []

  const progressMap = new Map(
    milestoneStats.map((s) => [
      s.projectId,
      s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
    ])
  )

  // ── Derive values ─────────────────────────────────────────────────────────────

  const activeProjects = activeCountRow[0]?.total ?? 0
  const onHoldProjects = onHoldCountRow[0]?.total ?? 0
  const pipeline = parseFloat(pipelineRow[0]?.total ?? "0")

  const projectList: ProjectItem[] = projectRows.map((p) => ({
    id: p.id,
    name: p.name,
    clientName: p.clientName ?? null,
    status: p.status,
    value: p.budget ? formatCurrency(parseFloat(String(p.budget)), p.currency) : null,
    dueDate: p.dueDate ?? null,
    progress: progressMap.get(p.id) ?? 0,
  }))

  const activePList = projectList.filter((p) => p.status === "active")
  const avgProgress =
    activePList.length > 0
      ? Math.round(activePList.reduce((s, p) => s + p.progress, 0) / activePList.length)
      : 0

  const ordersThisWeek = ordersThisWeekRow[0]?.total ?? 0
  const ordersPending = ordersPendingRow[0]?.total ?? 0
  const ordersRevenue = parseFloat(ordersRevenueRow[0]?.total ?? "0")
  const ordersRefunded = ordersRefundedRow[0]?.total ?? 0

  const orderList: OrderItem[] = recentOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    amount: formatCurrency(parseFloat(String(o.total)), o.currency),
    createdAt: o.createdAt?.toISOString() ?? new Date().toISOString(),
  }))

  const openCount = openMilestonesRow[0]?.total ?? 0
  const overdueCount = overdueMilestonesRow[0]?.total ?? 0
  const doneTodayCount = doneTodayRow[0]?.total ?? 0

  const taskList: TaskItem[] = [
    ...openTaskList.map((m) => ({
      id: m.id,
      title: m.title,
      projectName: m.projectName,
      dueDate: m.dueDate ?? null,
      isComplete: false,
      isOverdue: isOverdue(m.dueDate),
      completedAt: null,
    })),
    ...doneTodayTaskList.map((m) => ({
      id: m.id,
      title: m.title,
      projectName: m.projectName,
      dueDate: m.dueDate ?? null,
      isComplete: true,
      isOverdue: false,
      completedAt: m.completedAt ? m.completedAt.toISOString() : null,
    })),
  ]

  return {
    projectsKpi: {
      active: activeProjects,
      onHold: onHoldProjects,
      avgProgress,
      pipeline: formatCurrency(pipeline),
    },
    projects: projectList,
    ordersKpi: {
      thisWeek: ordersThisWeek,
      pending: ordersPending,
      revenue: formatCurrency(ordersRevenue),
      refunded: ordersRefunded,
    },
    orders: orderList,
    tasksKpi: {
      open: openCount,
      overdue: overdueCount,
      doneToday: doneTodayCount,
    },
    tasks: taskList,
  }
}
