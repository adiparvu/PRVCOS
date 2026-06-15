import { inngest } from "../client"

export const groupKpiSnapshotFunction = inngest.createFunction(
  {
    id: "prv-group-kpi-snapshot",
    name: "Group KPI Snapshot — Nightly",
    retries: 2,
    concurrency: { limit: 2 },
  },
  { cron: "0 2 * * *" }, // 02:00 UTC daily
  async ({ step }) => {
    const startedAt = Date.now()

    const groups = await step.run("fetch-active-groups", async () => {
      const { db } = await import("@prv/db")
      const { companyGroups } = await import("@prv/db/schema")
      const { eq } = await import("drizzle-orm")

      return db
        .select({ id: companyGroups.id, name: companyGroups.name })
        .from(companyGroups)
        .where(eq(companyGroups.isActive, true))
    })

    if (groups.length === 0) return { groups: 0, snapshots: 0 }

    const snapshots = await step.run("aggregate-kpis", async () => {
      const { db } = await import("@prv/db")
      const {
        groupMemberships,
        groupKpiSnapshots,
        invoices,
        projects,
        companyMemberships,
        notifications,
        anomalyDetections,
      } = await import("@prv/db/schema")
      const { sql, eq, and, gte, lt, inArray, isNull } = await import("drizzle-orm")

      const todayStr = new Date().toISOString().slice(0, 10)
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

      let inserted = 0

      for (const group of groups) {
        const members = await db
          .select({ companyId: groupMemberships.companyId })
          .from(groupMemberships)
          .where(and(eq(groupMemberships.groupId, group.id), eq(groupMemberships.isActive, true)))

        const companyIds = members.map((m) => m.companyId)
        if (companyIds.length === 0) continue

        const [revenueRow, projectsRow, employeesRow, openAnomaliesRow] = await Promise.all([
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
            .from(anomalyDetections)
            .where(
              and(
                inArray(anomalyDetections.companyId, companyIds),
                isNull(anomalyDetections.resolvedAt)
              )
            ),
        ])

        const perCompanyRevenue = await db
          .select({
            companyId: invoices.companyId,
            revenue: sql<string>`COALESCE(SUM(${invoices.total}), 0)::text`,
          })
          .from(invoices)
          .where(
            and(
              inArray(invoices.companyId, companyIds),
              eq(invoices.status, "paid"),
              gte(invoices.paidAt, startOfMonth),
              lt(invoices.paidAt, startOfNextMonth)
            )
          )
          .groupBy(invoices.companyId)

        const companyBreakdown = companyIds.map((cid) => ({
          companyId: cid,
          revenue: perCompanyRevenue.find((r) => r.companyId === cid)?.revenue ?? "0",
        }))

        await db
          .insert(groupKpiSnapshots)
          .values({
            groupId: group.id,
            snapshotDate: todayStr,
            totalRevenue: revenueRow[0]?.total ?? "0",
            totalActiveProjects: String(projectsRow[0]?.count ?? 0),
            totalActiveEmployees: String(employeesRow[0]?.count ?? 0),
            totalOpenAlerts: String(openAnomaliesRow[0]?.count ?? 0),
            companyBreakdown,
            companiesIncluded: String(companyIds.length),
            aggregatedAt: new Date(),
            durationMs: String(Date.now() - startedAt),
          })
          .onConflictDoUpdate({
            target: [groupKpiSnapshots.groupId, groupKpiSnapshots.snapshotDate],
            set: {
              totalRevenue: revenueRow[0]?.total ?? "0",
              totalActiveProjects: String(projectsRow[0]?.count ?? 0),
              totalActiveEmployees: String(employeesRow[0]?.count ?? 0),
              totalOpenAlerts: String(openAnomaliesRow[0]?.count ?? 0),
              companyBreakdown,
              companiesIncluded: String(companyIds.length),
              aggregatedAt: new Date(),
              durationMs: String(Date.now() - startedAt),
            },
          })

        inserted++
      }

      return inserted
    })

    return { groups: groups.length, snapshots }
  }
)
