import { inngest } from "../../client"
import { evaluateAlertRules, type AlertRuleInput } from "@prv/ai-engine/alert-rules"

// Autonomous alert evaluation (roadmap 16.4). Every 6 hours, run the alert
// rules engine per company over the latest KPI snapshots and persist any newly
// triggered alerts, deduped by rule source against still-open alerts. This is
// the scheduled counterpart to POST /api/alerts/evaluate.
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
      const { alerts, kpiDailySnapshots } = await import("@prv/db/schema")
      const { and, desc, eq, inArray, ne } = await import("drizzle-orm")

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
        if (!current) continue
        const previous = rows[1]

        const prevRevenue = previous ? num(previous.revenueMonth) : 0
        const revenueDeltaPct =
          previous && prevRevenue > 0
            ? ((num(current.revenueMonth) - prevRevenue) / prevRevenue) * 100
            : null
        const attendanceRatePct =
          current.headcount > 0 ? (num(current.presentToday) / current.headcount) * 100 : null

        const input: AlertRuleInput = {
          revenueDeltaPct,
          cashPosition: null,
          cashThreshold: 0,
          attendanceRatePct,
          openCriticalSafety: 0,
          stockoutRisk: 0,
          overdueApprovalsOver48h: 0,
          healthScore: num(current.healthScore),
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
