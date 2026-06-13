import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { invoices, expenses, tasks, projects, users, leaveRequests } from "@prv/db/schema"
import { and, eq, gte, inArray, isNull, lt, ne, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function currentMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const from = `${year}-${pad(month)}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = `${nextYear}-${pad(nextMonth)}-01`
  return { from, to }
}

function prevMonthRange() {
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() // prev month (0-indexed → last month)
  if (month === 0) {
    month = 12
    year -= 1
  }
  const from = `${year}-${pad(month)}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = `${nextYear}-${pad(nextMonth)}-01`
  return { from, to }
}

export const GET = withGates(
  { action: "dashboard.executive.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const { from: curFrom, to: curTo } = currentMonthRange()
    const { from: prevFrom, to: prevTo } = prevMonthRange()

    const [
      curRevRow,
      prevRevRow,
      curExpRow,
      prevExpRow,
      taskCountRow,
      activeProjectsRow,
      activeEmployeesRow,
      pendingLeaveRow,
      openInvoicesRow,
      overdueInvoicesRow,
    ] = await Promise.all([
      // Current month revenue (paid + overdue invoices)
      db
        .select({ total: sql<string>`COALESCE(SUM(${invoices.total}), '0')` })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            isNull(invoices.deletedAt),
            inArray(invoices.status, ["paid", "overdue"]),
            gte(invoices.issueDate, curFrom),
            lt(invoices.issueDate, curTo)
          )
        ),
      // Previous month revenue
      db
        .select({ total: sql<string>`COALESCE(SUM(${invoices.total}), '0')` })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            isNull(invoices.deletedAt),
            inArray(invoices.status, ["paid", "overdue"]),
            gte(invoices.issueDate, prevFrom),
            lt(invoices.issueDate, prevTo)
          )
        ),
      // Current month expenses
      db
        .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')` })
        .from(expenses)
        .where(
          and(
            eq(expenses.companyId, companyId),
            isNull(expenses.deletedAt),
            inArray(expenses.status, ["approved", "paid"]),
            gte(expenses.date, curFrom),
            lt(expenses.date, curTo)
          )
        ),
      // Previous month expenses
      db
        .select({ total: sql<string>`COALESCE(SUM(${expenses.amount}), '0')` })
        .from(expenses)
        .where(
          and(
            eq(expenses.companyId, companyId),
            isNull(expenses.deletedAt),
            inArray(expenses.status, ["approved", "paid"]),
            gte(expenses.date, prevFrom),
            lt(expenses.date, prevTo)
          )
        ),
      // Task counts by status and priority
      db
        .select({
          status: tasks.status,
          priority: tasks.priority,
          cnt: sql<number>`COUNT(*)::int`,
        })
        .from(tasks)
        .where(and(eq(tasks.companyId, companyId), isNull(tasks.deletedAt)))
        .groupBy(tasks.status, tasks.priority),
      // Active projects
      db
        .select({ cnt: sql<number>`COUNT(*)::int` })
        .from(projects)
        .where(
          and(
            eq(projects.companyId, companyId),
            isNull(projects.deletedAt),
            eq(projects.status, "active")
          )
        ),
      // Active employees
      db
        .select({ cnt: sql<number>`COUNT(*)::int` })
        .from(users)
        .where(and(eq(users.companyId, companyId), eq(users.isActive, true))),
      // Pending leave requests
      db
        .select({ cnt: sql<number>`COUNT(*)::int` })
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.companyId, companyId),
            isNull(leaveRequests.deletedAt),
            eq(leaveRequests.status, "pending")
          )
        ),
      // Open (sent) invoices
      db
        .select({ cnt: sql<number>`COUNT(*)::int` })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            isNull(invoices.deletedAt),
            eq(invoices.status, "sent")
          )
        ),
      // Overdue invoices + amount
      db
        .select({
          cnt: sql<number>`COUNT(*)::int`,
          amount: sql<string>`COALESCE(SUM(${invoices.total}), '0')`,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            isNull(invoices.deletedAt),
            eq(invoices.status, "overdue")
          )
        ),
    ])

    const curRevenue = parseFloat(curRevRow[0]?.total ?? "0")
    const prevRevenue = parseFloat(prevRevRow[0]?.total ?? "0")
    const curExpenses = parseFloat(curExpRow[0]?.total ?? "0")
    const prevExpenses = parseFloat(prevExpRow[0]?.total ?? "0")

    const revenueGrowth =
      prevRevenue > 0 ? Math.round(((curRevenue - prevRevenue) / prevRevenue) * 1000) / 10 : null
    const expensesGrowth =
      prevExpenses > 0
        ? Math.round(((curExpenses - prevExpenses) / prevExpenses) * 1000) / 10
        : null

    const curProfit = curRevenue - curExpenses
    const prevProfit = prevRevenue - prevExpenses
    const profitMargin = curRevenue > 0 ? Math.round((curProfit / curRevenue) * 1000) / 10 : 0

    // Aggregate task counts
    let totalTasks = 0
    let urgentTasks = 0
    let inProgressTasks = 0
    let doneTasks = 0
    for (const row of taskCountRow) {
      totalTasks += row.cnt
      if (row.status === "in_progress") inProgressTasks += row.cnt
      if (row.status === "done") doneTasks += row.cnt
      if (row.priority === "urgent" && row.status !== "done") urgentTasks += row.cnt
    }

    const activeProjects = activeProjectsRow[0]?.cnt ?? 0
    const activeEmployees = activeEmployeesRow[0]?.cnt ?? 0
    const pendingLeave = pendingLeaveRow[0]?.cnt ?? 0
    const openInvoices = openInvoicesRow[0]?.cnt ?? 0
    const overdueInvoices = overdueInvoicesRow[0]?.cnt ?? 0
    const overdueAmount = parseFloat(overdueInvoicesRow[0]?.amount ?? "0")

    // Current month VAT estimate
    const curVatCollectedRow = await db
      .select({ vat: sql<string>`COALESCE(SUM(${invoices.vatAmount}), '0')` })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, companyId),
          isNull(invoices.deletedAt),
          inArray(invoices.status, ["paid", "overdue"]),
          gte(invoices.issueDate, curFrom),
          lt(invoices.issueDate, curTo)
        )
      )
    const vatCollected = parseFloat(curVatCollectedRow[0]?.vat ?? "0")
    const vatDeductible = Math.round(((curExpenses * 19) / 119) * 100) / 100
    const vatDue = Math.round((vatCollected - vatDeductible) * 100) / 100

    // Build alerts
    type AlertSeverity = "critical" | "warning" | "info"
    const alerts: Array<{
      id: string
      severity: AlertSeverity
      title: string
      description: string
      count: number
      actionPath: string
    }> = []

    if (overdueInvoices > 0) {
      alerts.push({
        id: "overdue_invoices",
        severity: "critical",
        title: "Facturi restante",
        description: `${overdueInvoices} factură(i) depășite cu ${Math.round(overdueAmount).toLocaleString("ro-RO")} RON total`,
        count: overdueInvoices,
        actionPath: "/finance?filter=overdue",
      })
    }
    if (urgentTasks > 0) {
      alerts.push({
        id: "urgent_tasks",
        severity: "warning",
        title: "Sarcini urgente",
        description: `${urgentTasks} sarcină(i) urgentă(e) necompletate`,
        count: urgentTasks,
        actionPath: "/operations?priority=urgent",
      })
    }
    if (pendingLeave > 0) {
      alerts.push({
        id: "pending_leave",
        severity: "info",
        title: "Cereri concediu în așteptare",
        description: `${pendingLeave} cerere(i) de concediu necesită aprobare`,
        count: pendingLeave,
        actionPath: "/people/time-off",
      })
    }
    if (curRevenue > 0 && revenueGrowth !== null && revenueGrowth < -10) {
      alerts.push({
        id: "revenue_decline",
        severity: "warning",
        title: "Scădere venituri",
        description: `Veniturile au scăzut cu ${Math.abs(revenueGrowth)}% față de luna trecută`,
        count: 1,
        actionPath: "/finance?view=pl",
      })
    }

    return NextResponse.json({
      snapshot: {
        revenue: {
          current: curRevenue,
          prev: prevRevenue,
          growthPct: revenueGrowth,
          currency: "RON",
        },
        expenses: {
          current: curExpenses,
          prev: prevExpenses,
          growthPct: expensesGrowth,
        },
        profit: {
          current: curProfit,
          prev: prevProfit,
          marginPct: profitMargin,
        },
        activeProjects,
        totalTasks,
        urgentTasks,
        inProgressTasks,
        doneTasks,
        activeEmployees,
        pendingLeave,
        pendingApprovals: pendingLeave,
        openInvoices,
        overdueInvoices,
        overdueAmount,
        vatDue,
      },
      alerts,
      generatedAt: new Date().toISOString(),
    })
  }
)
