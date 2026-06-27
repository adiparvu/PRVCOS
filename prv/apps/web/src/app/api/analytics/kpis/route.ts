import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import {
  kpiDailySnapshots,
  invoices,
  projects,
  tasks,
  companyMemberships,
  expenses,
  clients,
  orders,
  attendanceRecords,
  leaveRequests,
} from "@prv/db/schema"
import { and, eq, gte, lt, isNull, sql, desc } from "drizzle-orm"
import { cacheMemo } from "@prv/cache"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

// GET /api/analytics/kpis
// Returns last 30 days of KPI snapshots + live current-day values.
export const GET = withGates(
  { action: "analytics.kpis.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session

    const [snapshots, live] = await Promise.all([
      // Last 30 historical snapshots (most recent first)
      cacheMemo(
        "analytics_kpi_snapshots",
        companyId,
        () =>
          db
            .select()
            .from(kpiDailySnapshots)
            .where(eq(kpiDailySnapshots.companyId, companyId))
            .orderBy(desc(kpiDailySnapshots.snapshotDate))
            .limit(30),
        { ttl: 3600 }
      ),

      // Live current-day aggregates
      cacheMemo(
        "analytics_kpi_live",
        companyId,
        async () => {
          const now = new Date()
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
          const startOfYear = new Date(now.getFullYear(), 0, 1)
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const todayEnd = new Date(todayStart.getTime() + 86_400_000)

          const [
            revMonth,
            revYtd,
            overdue,
            activeProjects,
            totalTasks,
            doneTasks,
            headcount,
            presentToday,
            pendingLeave,
            expensesMonth,
            activeClients,
            leads,
            shopMonth,
          ] = await Promise.all([
            db
              .select({ v: sql<string>`COALESCE(SUM(${invoices.total}),0)::text` })
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
              .select({ v: sql<string>`COALESCE(SUM(${invoices.total}),0)::text` })
              .from(invoices)
              .where(
                and(
                  eq(invoices.companyId, companyId),
                  eq(invoices.status, "paid"),
                  gte(invoices.paidAt, startOfYear)
                )
              ),
            db
              .select({ v: sql<string>`COALESCE(SUM(${invoices.total}),0)::text` })
              .from(invoices)
              .where(and(eq(invoices.companyId, companyId), eq(invoices.status, "overdue"))),
            db
              .select({ v: sql<number>`COUNT(*)::int` })
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
              .select({ v: sql<number>`COUNT(*)::int` })
              .from(tasks)
              .where(eq(tasks.companyId, companyId)),
            db
              .select({ v: sql<number>`COUNT(*)::int` })
              .from(tasks)
              .where(and(eq(tasks.companyId, companyId), eq(tasks.status, "done"))),
            db
              .select({ v: sql<number>`COUNT(*)::int` })
              .from(companyMemberships)
              .where(
                and(
                  eq(companyMemberships.companyId, companyId),
                  eq(companyMemberships.status, "ACTIVE")
                )
              ),
            db
              .select({ v: sql<number>`COUNT(*)::int` })
              .from(attendanceRecords)
              .where(
                and(
                  eq(attendanceRecords.companyId, companyId),
                  gte(attendanceRecords.clockIn, todayStart),
                  lt(attendanceRecords.clockIn, todayEnd)
                )
              ),
            db
              .select({ v: sql<number>`COUNT(*)::int` })
              .from(leaveRequests)
              .where(
                and(eq(leaveRequests.companyId, companyId), eq(leaveRequests.status, "pending"))
              ),
            db
              .select({ v: sql<string>`COALESCE(SUM(${expenses.amount}),0)::text` })
              .from(expenses)
              .where(
                and(
                  eq(expenses.companyId, companyId),
                  gte(expenses.createdAt, startOfMonth),
                  lt(expenses.createdAt, startOfNextMonth)
                )
              ),
            db
              .select({ v: sql<number>`COUNT(*)::int` })
              .from(clients)
              .where(and(eq(clients.companyId, companyId), eq(clients.status, "active"))),
            db
              .select({ v: sql<number>`COUNT(*)::int` })
              .from(clients)
              .where(and(eq(clients.companyId, companyId), eq(clients.status, "prospect"))),
            db
              .select({
                count: sql<number>`COUNT(*)::int`,
                revenue: sql<string>`COALESCE(SUM(${orders.total}),0)::text`,
              })
              .from(orders)
              .where(
                and(
                  eq(orders.companyId, companyId),
                  gte(orders.createdAt, startOfMonth),
                  lt(orders.createdAt, startOfNextMonth)
                )
              ),
          ])

          const rm = revMonth[0]?.v ?? "0"
          const em = expensesMonth[0]?.v ?? "0"

          return {
            revenueMonth: rm,
            revenueYtd: revYtd[0]?.v ?? "0",
            overdueAmount: overdue[0]?.v ?? "0",
            activeProjects: activeProjects[0]?.v ?? 0,
            totalTasks: totalTasks[0]?.v ?? 0,
            doneTasks: doneTasks[0]?.v ?? 0,
            headcount: headcount[0]?.v ?? 0,
            presentToday: presentToday[0]?.v ?? 0,
            pendingLeave: pendingLeave[0]?.v ?? 0,
            expensesMonth: em,
            grossProfit: String(Math.max(0, parseFloat(rm) - parseFloat(em))),
            activeClients: activeClients[0]?.v ?? 0,
            activeLeads: leads[0]?.v ?? 0,
            shopOrders: shopMonth[0]?.count ?? 0,
            shopRevenue: shopMonth[0]?.revenue ?? "0",
            periodKey: `${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
          }
        },
        { ttl: 120 } // refresh every 2 min
      ),
    ])

    return NextResponse.json({ snapshots, live })
  }
)
