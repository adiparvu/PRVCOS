import { inngest } from "../client"

// Runs nightly at 01:00 UTC, after the group snapshot (02:00).
// Creates one kpiDailySnapshots row per active company covering all 6 KPI domains.
// Uses upsert so re-runs don't duplicate rows if manually triggered.

export const companyKpiSnapshotFunction = inngest.createFunction(
  {
    id: "prv-company-kpi-snapshot",
    name: "Company KPI Snapshot — Nightly",
    retries: 2,
    concurrency: { limit: 3 },
  },
  { cron: "0 1 * * *" }, // 01:00 UTC daily
  async ({ step }) => {
    const companies = await step.run("fetch-active-companies", async () => {
      const { db } = await import("@prv/db")
      const { companies } = await import("@prv/db/schema")
      const { eq } = await import("drizzle-orm")

      return db.select({ id: companies.id }).from(companies).where(eq(companies.isActive, true))
    })

    if (companies.length === 0) return { companies: 0 }

    const todayStr = new Date().toISOString().slice(0, 10)
    let inserted = 0

    for (const company of companies) {
      await step.run(`snapshot-${company.id}`, async () => {
        const { db } = await import("@prv/db")
        const {
          invoices,
          expenses,
          projects,
          tasks,
          companyMemberships,
          leaveRequests,
          attendanceRecords,
          orders,
          clients,
          kpiDailySnapshots,
        } = await import("@prv/db/schema")
        const { sql, and, eq, gte, lt, isNull } = await import("drizzle-orm")

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const todayEnd = new Date(todayStart.getTime() + 86_400_000)
        const cid = company.id

        const [
          revMonthRow,
          revYtdRow,
          invoiceCountRow,
          overdueRow,
          activeProjectsRow,
          totalTasksRow,
          doneTasksRow,
          headcountRow,
          presentTodayRow,
          pendingLeaveRow,
          expensesMonthRow,
          activeClientsRow,
          leadsRow,
          ordersMonthRow,
        ] = await Promise.all([
          // Domain 1 — Revenue: paid invoices this month
          db
            .select({ v: sql<string>`COALESCE(SUM(${invoices.total}),0)::text` })
            .from(invoices)
            .where(
              and(
                eq(invoices.companyId, cid),
                eq(invoices.status, "paid"),
                gte(invoices.paidAt, startOfMonth),
                lt(invoices.paidAt, startOfNextMonth)
              )
            ),

          // Domain 1 — YTD revenue
          db
            .select({ v: sql<string>`COALESCE(SUM(${invoices.total}),0)::text` })
            .from(invoices)
            .where(
              and(
                eq(invoices.companyId, cid),
                eq(invoices.status, "paid"),
                gte(invoices.paidAt, startOfYear)
              )
            ),

          // Domain 1 — invoice count this month (sent + paid)
          db
            .select({ v: sql<number>`COUNT(*)::int` })
            .from(invoices)
            .where(
              and(
                eq(invoices.companyId, cid),
                gte(invoices.createdAt, startOfMonth),
                lt(invoices.createdAt, startOfNextMonth)
              )
            ),

          // Domain 1 — overdue amount
          db
            .select({ v: sql<string>`COALESCE(SUM(${invoices.total}),0)::text` })
            .from(invoices)
            .where(and(eq(invoices.companyId, cid), eq(invoices.status, "overdue"))),

          // Domain 2 — active projects
          db
            .select({ v: sql<number>`COUNT(*)::int` })
            .from(projects)
            .where(
              and(
                eq(projects.companyId, cid),
                eq(projects.status, "active"),
                eq(projects.isActive, true),
                isNull(projects.deletedAt)
              )
            ),

          // Domain 2 — total tasks
          db
            .select({ v: sql<number>`COUNT(*)::int` })
            .from(tasks)
            .where(eq(tasks.companyId, cid)),

          // Domain 2 — done tasks
          db
            .select({ v: sql<number>`COUNT(*)::int` })
            .from(tasks)
            .where(and(eq(tasks.companyId, cid), eq(tasks.status, "done"))),

          // Domain 3 — headcount (active employees)
          db
            .select({ v: sql<number>`COUNT(*)::int` })
            .from(companyMemberships)
            .where(
              and(eq(companyMemberships.companyId, cid), eq(companyMemberships.status, "ACTIVE"))
            ),

          // Domain 3 — present today (checked-in)
          db
            .select({ v: sql<number>`COUNT(*)::int` })
            .from(attendanceRecords)
            .where(
              and(
                eq(attendanceRecords.companyId, cid),
                gte(attendanceRecords.checkInAt, todayStart),
                lt(attendanceRecords.checkInAt, todayEnd)
              )
            ),

          // Domain 3 — pending leave requests
          db
            .select({ v: sql<number>`COUNT(*)::int` })
            .from(leaveRequests)
            .where(and(eq(leaveRequests.companyId, cid), eq(leaveRequests.status, "pending"))),

          // Domain 4 — expenses this month
          db
            .select({ v: sql<string>`COALESCE(SUM(${expenses.amount}),0)::text` })
            .from(expenses)
            .where(
              and(
                eq(expenses.companyId, cid),
                gte(expenses.createdAt, startOfMonth),
                lt(expenses.createdAt, startOfNextMonth)
              )
            ),

          // Domain 5 — active clients (CRM)
          db
            .select({ v: sql<number>`COUNT(*)::int` })
            .from(clients)
            .where(and(eq(clients.companyId, cid), eq(clients.status, "active"))),

          // Domain 5 — leads (prospects)
          db
            .select({ v: sql<number>`COUNT(*)::int` })
            .from(clients)
            .where(and(eq(clients.companyId, cid), eq(clients.status, "prospect"))),

          // Domain 6 — orders this month (shop)
          db
            .select({
              count: sql<number>`COUNT(*)::int`,
              revenue: sql<string>`COALESCE(SUM(${orders.total}),0)::text`,
            })
            .from(orders)
            .where(
              and(
                eq(orders.companyId, cid),
                gte(orders.createdAt, startOfMonth),
                lt(orders.createdAt, startOfNextMonth)
              )
            ),
        ])

        const revenueMonth = revMonthRow[0]?.v ?? "0"
        const revenueYtd = revYtdRow[0]?.v ?? "0"
        const expensesMonth = expensesMonthRow[0]?.v ?? "0"
        const grossProfit = String(
          Math.max(0, parseFloat(revenueMonth) - parseFloat(expensesMonth))
        )

        const pipelineValue = await db
          .select({ v: sql<string>`COALESCE(SUM(${invoices.total}),0)::text` })
          .from(invoices)
          .where(and(eq(invoices.companyId, cid), eq(invoices.status, "sent")))

        // Health score: weighted sum across 6 domains (0-100)
        const headcount = headcountRow[0]?.v ?? 0
        const doneTasks = doneTasksRow[0]?.v ?? 0
        const totalTasks = totalTasksRow[0]?.v ?? 1
        const taskCompletion = totalTasks > 0 ? doneTasks / totalTasks : 0
        const presentRatio = headcount > 0 ? (presentTodayRow[0]?.v ?? 0) / headcount : 0
        const revenueScore = Math.min(100, (parseFloat(revenueMonth) / 10_000) * 20) // 20pts max
        const operationsScore = taskCompletion * 20 // 20pts
        const workforceScore = presentRatio * 20 // 20pts
        const financialScore =
          parseFloat(grossProfit) > 0
            ? Math.min(20, (parseFloat(grossProfit) / parseFloat(revenueMonth || "1")) * 20)
            : 0 // 20pts
        const crmScore = Math.min(10, activeClientsRow[0]?.v ?? 0) // 10pts max
        const shopScore = Math.min(10, ordersMonthRow[0]?.count ?? 0) // 10pts max

        const healthScore = Math.round(
          revenueScore + operationsScore + workforceScore + financialScore + crmScore + shopScore
        )

        await db
          .insert(kpiDailySnapshots)
          .values({
            companyId: cid,
            snapshotDate: todayStr,
            revenueMonth,
            revenueYtd,
            invoiceCount: invoiceCountRow[0]?.v ?? 0,
            overdueAmount: overdueRow[0]?.v ?? "0",
            activeProjects: activeProjectsRow[0]?.v ?? 0,
            totalTasks,
            doneTasks,
            headcount,
            presentToday: presentTodayRow[0]?.v ?? 0,
            pendingLeave: pendingLeaveRow[0]?.v ?? 0,
            expensesMonth,
            grossProfit,
            activeLeads: leadsRow[0]?.v ?? 0,
            pipelineValue: pipelineValue[0]?.v ?? "0",
            activeClients: activeClientsRow[0]?.v ?? 0,
            shopOrders: ordersMonthRow[0]?.count ?? 0,
            shopRevenue: ordersMonthRow[0]?.revenue ?? "0",
            healthScore: Math.min(100, Math.max(0, healthScore)),
          })
          .onConflictDoUpdate({
            target: [kpiDailySnapshots.companyId, kpiDailySnapshots.snapshotDate],
            set: {
              revenueMonth,
              revenueYtd,
              invoiceCount: invoiceCountRow[0]?.v ?? 0,
              overdueAmount: overdueRow[0]?.v ?? "0",
              activeProjects: activeProjectsRow[0]?.v ?? 0,
              totalTasks,
              doneTasks,
              headcount,
              presentToday: presentTodayRow[0]?.v ?? 0,
              pendingLeave: pendingLeaveRow[0]?.v ?? 0,
              expensesMonth,
              grossProfit,
              activeLeads: leadsRow[0]?.v ?? 0,
              pipelineValue: pipelineValue[0]?.v ?? "0",
              activeClients: activeClientsRow[0]?.v ?? 0,
              shopOrders: ordersMonthRow[0]?.count ?? 0,
              shopRevenue: ordersMonthRow[0]?.revenue ?? "0",
              healthScore: Math.min(100, Math.max(0, healthScore)),
            },
          })
      })
      inserted++
    }

    return { companies: companies.length, inserted }
  }
)
