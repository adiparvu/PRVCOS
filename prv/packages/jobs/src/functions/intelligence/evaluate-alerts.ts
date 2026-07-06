import { inngest } from "../../client"
import { evaluateAlertRules, type AlertRuleInput } from "@prv/ai-engine/alert-rules"

const APPROVAL_STALE_MS = 48 * 3_600_000

// Autonomous alert evaluation (roadmap 16.4). Every 6 hours, run the alert
// rules engine per company over the latest KPI snapshots plus live safety /
// inventory / approval signals, and persist any newly triggered alerts, deduped
// by rule source against still-open alerts. Scheduled counterpart to
// POST /api/alerts/evaluate.
export const evaluateAlertsFunction = inngest.createFunction(
  {
    id: "prv-evaluate-alerts",
    name: "Evaluate Alert Rules",
    retries: 1,
    concurrency: { limit: 3 },
  },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const companies = await step.run("fetch-companies", async () => {
      const { db } = await import("@prv/db")
      const { companies } = await import("@prv/db/schema")
      const { isNull } = await import("drizzle-orm")

      return db.select({ id: companies.id }).from(companies).where(isNull(companies.deletedAt))
    })

    if (companies.length === 0) return { scanned: 0, created: 0 }

    const created = await step.run("evaluate-and-persist", async () => {
      const { db } = await import("@prv/db")
      const { alerts, approvalRequests, kpiDailySnapshots, safetyIncidents, stockLevels } =
        await import("@prv/db/schema")
      const { and, count, countDistinct, desc, eq, gt, inArray, isNotNull, lt, ne, sql } =
        await import("drizzle-orm")

      const num = (v: unknown): number => {
        const n = Number(v ?? 0)
        return Number.isFinite(n) ? n : 0
      }

      let total = 0

      for (const company of companies) {
        const cid = company.id

        const rows = await db
          .select({
            revenueMonth: kpiDailySnapshots.revenueMonth,
            headcount: kpiDailySnapshots.headcount,
            presentToday: kpiDailySnapshots.presentToday,
            healthScore: kpiDailySnapshots.healthScore,
          })
          .from(kpiDailySnapshots)
          .where(eq(kpiDailySnapshots.companyId, cid))
          .orderBy(desc(kpiDailySnapshots.snapshotDate))
          .limit(2)

        const current = rows[0]
        const previous = rows[1]

        const safetyRows = await db
          .select({ n: count() })
          .from(safetyIncidents)
          .where(
            and(
              eq(safetyIncidents.companyId, cid),
              eq(safetyIncidents.severity, "critical"),
              inArray(safetyIncidents.status, ["open", "under_investigation"])
            )
          )
        const stockoutRows = await db
          .select({ n: countDistinct(stockLevels.productId) })
          .from(stockLevels)
          .where(
            and(
              eq(stockLevels.companyId, cid),
              isNotNull(stockLevels.reorderPoint),
              gt(stockLevels.reorderPoint, 0),
              sql`${stockLevels.quantity} <= ${stockLevels.reorderPoint}`
            )
          )
        const approvalRows = await db
          .select({ n: count() })
          .from(approvalRequests)
          .where(
            and(
              eq(approvalRequests.companyId, cid),
              eq(approvalRequests.status, "pending"),
              lt(approvalRequests.createdAt, new Date(Date.now() - APPROVAL_STALE_MS))
            )
          )

        const prevRevenue = previous ? num(previous.revenueMonth) : 0
        const revenueDeltaPct =
          previous && prevRevenue > 0
            ? ((num(current?.revenueMonth) - prevRevenue) / prevRevenue) * 100
            : null
        const attendanceRatePct =
          current && current.headcount > 0
            ? (num(current.presentToday) / current.headcount) * 100
            : null

        const input: AlertRuleInput = {
          revenueDeltaPct,
          cashPosition: null,
          cashThreshold: 0,
          attendanceRatePct,
          openCriticalSafety: num(safetyRows[0]?.n),
          stockoutRisk: num(stockoutRows[0]?.n),
          overdueApprovalsOver48h: num(approvalRows[0]?.n),
          healthScore: current ? num(current.healthScore) : 100,
        }

        const specs = evaluateAlertRules(input)
        if (specs.length === 0) continue

        const sources = specs.map((s) => `rule:${s.ruleKey}`)
        const openRows = await db
          .select({ source: alerts.source })
          .from(alerts)
          .where(
            and(
              eq(alerts.companyId, cid),
              ne(alerts.status, "resolved"),
              inArray(alerts.source, sources)
            )
          )
        const openSources = new Set(openRows.map((r) => r.source))
        const toCreate = specs.filter((s) => !openSources.has(`rule:${s.ruleKey}`))

        if (toCreate.length > 0) {
          await db.insert(alerts).values(
            toCreate.map((s) => ({
              companyId: cid,
              severity: s.severity,
              status: "open" as const,
              title: s.title,
              description: s.description,
              source: `rule:${s.ruleKey}`,
            }))
          )
          total += toCreate.length
        }
      }

      return total
    })

    return { scanned: companies.length, created }
  }
)
