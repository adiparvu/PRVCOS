import { inngest } from "../../client"

export const detectAnomaliesFunction = inngest.createFunction(
  {
    id: "prv-detect-anomalies",
    name: "Detect Anomalies",
    retries: 1,
    concurrency: { limit: 3 },
  },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    // Step 1: fetch all active companies
    const companies = await step.run("fetch-companies", async () => {
      const { db } = await import("@prv/db")
      const { companies } = await import("@prv/db/schema")
      const { isNull } = await import("drizzle-orm")

      return db
        .select({ id: companies.id, name: companies.name })
        .from(companies)
        .where(isNull(companies.deletedAt))
    })

    if (companies.length === 0) return { scanned: 0 }

    // Step 2: scan each company and collect new anomalies
    const allAnomalies = await step.run("scan-companies", async () => {
      const { db } = await import("@prv/db")
      const { invoices, projects, attendanceRecords } = await import("@prv/db/schema")
      const { eq, and, lt, not, inArray, count, sql } = await import("drizzle-orm")

      const todayStr = new Date().toISOString().slice(0, 10)
      const nowTs = new Date()

      type NewAnomaly = {
        companyId: string
        type: "risk" | "spike" | "opportunity"
        severity: "high" | "medium" | "low"
        domain: string
        title: string
        description: string
        metric: string
        actionLabel: string
        href: string
      }

      const anomalies: NewAnomaly[] = []

      for (const company of companies) {
        const cid = company.id

        // ── Overdue invoices ────────────────────────────────────────────────
        const overdueRows = await db
          .select({ id: invoices.id, total: invoices.total })
          .from(invoices)
          .where(
            and(
              eq(invoices.companyId, cid),
              not(inArray(invoices.status, ["paid", "cancelled", "draft"])),
              lt(invoices.dueDate, todayStr),
              isNull(invoices.deletedAt)
            )
          )
          .limit(200)

        if (overdueRows.length > 0) {
          const totalOverdue = overdueRows.reduce((sum, r) => sum + Number(r.total ?? 0), 0)
          anomalies.push({
            companyId: cid,
            type: "risk",
            severity: overdueRows.length >= 5 || totalOverdue >= 10_000 ? "high" : "medium",
            domain: "Finance",
            title: `${overdueRows.length} overdue invoice${overdueRows.length > 1 ? "s" : ""}`,
            description: `${overdueRows.length} unpaid invoice${overdueRows.length > 1 ? "s" : ""} past due date, totalling ${totalOverdue.toLocaleString("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 })}.`,
            metric: `${overdueRows.length} invoices`,
            actionLabel: "Review Invoices",
            href: "/finance/invoices?filter=overdue",
          })
        }

        // ── Overdue projects ────────────────────────────────────────────────
        const overdueProjects = await db
          .select({ id: projects.id, name: projects.name })
          .from(projects)
          .where(
            and(
              eq(projects.companyId, cid),
              not(inArray(projects.status, ["completed", "cancelled", "on_hold"])),
              lt(projects.dueDate, todayStr)
            )
          )
          .limit(100)

        if (overdueProjects.length > 0) {
          anomalies.push({
            companyId: cid,
            type: "risk",
            severity: overdueProjects.length >= 3 ? "high" : "medium",
            domain: "Projects",
            title: `${overdueProjects.length} overdue project${overdueProjects.length > 1 ? "s" : ""}`,
            description: `${overdueProjects.length} active project${overdueProjects.length > 1 ? "s" : ""} passed their deadline without completion.`,
            metric: `${overdueProjects.length} projects`,
            actionLabel: "View Projects",
            href: "/projects?filter=overdue",
          })
        }

        // ── Low attendance today ────────────────────────────────────────────
        const [attendanceSummary] = await db
          .select({
            total: count(),
            present: sql<number>`count(*) filter (where ${attendanceRecords.status} in ('present', 'late', 'clocked_out'))`,
          })
          .from(attendanceRecords)
          .where(and(eq(attendanceRecords.companyId, cid), eq(attendanceRecords.date, todayStr)))

        if (attendanceSummary && attendanceSummary.total >= 3) {
          const presentCount = Number(attendanceSummary.present)
          const totalCount = Number(attendanceSummary.total)
          const rate = presentCount / totalCount

          if (rate < 0.7) {
            const pct = Math.round(rate * 100)
            anomalies.push({
              companyId: cid,
              type: "risk",
              severity: rate < 0.5 ? "high" : "medium",
              domain: "Workforce",
              title: `Low attendance today — ${pct}%`,
              description: `Only ${presentCount} of ${totalCount} scheduled employees have clocked in today (${pct}%).`,
              metric: `${pct}% present`,
              actionLabel: "View Attendance",
              href: "/workforce/attendance",
            })
          }
        }

        // ── Revenue month-over-month drop ───────────────────────────────────
        const now = new Date()
        const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .slice(0, 10)
        const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          .toISOString()
          .slice(0, 10)
        const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
          .toISOString()
          .slice(0, 10)

        const [thisMonthRevenue] = await db
          .select({ total: sql<number>`coalesce(sum(${invoices.total}), 0)` })
          .from(invoices)
          .where(
            and(
              eq(invoices.companyId, cid),
              eq(invoices.status, "paid"),
              sql`${invoices.issueDate} >= ${firstOfThisMonth}`,
              sql`${invoices.issueDate} < ${firstOfThisMonth}::date + interval '1 month'`,
              isNull(invoices.deletedAt)
            )
          )

        const [lastMonthRevenue] = await db
          .select({ total: sql<number>`coalesce(sum(${invoices.total}), 0)` })
          .from(invoices)
          .where(
            and(
              eq(invoices.companyId, cid),
              eq(invoices.status, "paid"),
              sql`${invoices.issueDate} >= ${firstOfLastMonth}`,
              sql`${invoices.issueDate} <= ${lastOfLastMonth}`,
              isNull(invoices.deletedAt)
            )
          )

        const thisTotal = Number(thisMonthRevenue?.total ?? 0)
        const lastTotal = Number(lastMonthRevenue?.total ?? 0)

        if (lastTotal > 1_000 && thisTotal < lastTotal * 0.8) {
          const dropPct = Math.round((1 - thisTotal / lastTotal) * 100)
          anomalies.push({
            companyId: cid,
            type: "risk",
            severity: dropPct >= 40 ? "high" : "medium",
            domain: "Finance",
            title: `Revenue down ${dropPct}% vs last month`,
            description: `This month's paid revenue (${thisTotal.toLocaleString("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 })}) is ${dropPct}% lower than last month (${lastTotal.toLocaleString("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 })}).`,
            metric: `−${dropPct}% MoM`,
            actionLabel: "View Finance",
            href: "/finance",
          })
        }
      }

      return anomalies
    })

    if (allAnomalies.length === 0) {
      return { scanned: companies.length, inserted: 0 }
    }

    // Step 3: resolve stale open anomalies and insert new ones
    const inserted = await step.run("persist-anomalies", async () => {
      const { db } = await import("@prv/db")
      const { anomalyDetections } = await import("@prv/db/schema")
      const { isNull, inArray, and } = await import("drizzle-orm")

      const companyIds = [...new Set(allAnomalies.map((a) => a.companyId))]

      // Mark all unresolved anomalies for these companies as resolved
      await db
        .update(anomalyDetections)
        .set({ resolvedAt: new Date() })
        .where(
          and(
            inArray(anomalyDetections.companyId, companyIds),
            isNull(anomalyDetections.resolvedAt)
          )
        )

      // Insert fresh anomalies
      await db.insert(anomalyDetections).values(
        allAnomalies.map((a) => ({
          ...a,
          createdAt: new Date(),
        }))
      )

      return allAnomalies.length
    })

    return { scanned: companies.length, inserted }
  }
)
