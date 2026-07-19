import { inngest } from "../client"

// Phase 15.4 — Scheduled report delivery.
// Hourly sweep: every enabled schedule whose next_run_at has passed gets its
// company KPI report emailed to its recipients, then its next_run_at advances by
// the schedule's frequency. Failures are recorded but still advance next_run_at
// so one bad run never wedges the schedule.
//
// The scheduling arithmetic below is a self-contained copy of the logic unit-
// tested in apps/web/src/lib/report-schedule.ts (package boundaries prevent a
// shared import from a job); keep the two in sync if the rules change.

type Frequency = "daily" | "weekly" | "monthly"

function advanceOnce(from: Date, frequency: Frequency): Date {
  if (frequency === "daily") return new Date(from.getTime() + 86_400_000)
  if (frequency === "weekly") return new Date(from.getTime() + 7 * 86_400_000)
  const y = from.getUTCFullYear()
  const m = from.getUTCMonth()
  const d = from.getUTCDate()
  const lastDay = new Date(Date.UTC(y, m + 2, 0)).getUTCDate()
  return new Date(
    Date.UTC(
      y,
      m + 1,
      Math.min(d, lastDay),
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds()
    )
  )
}

function computeNextRun(from: Date, frequency: Frequency, now: Date): Date {
  let next = advanceOnce(from, frequency)
  let guard = 0
  while (next.getTime() <= now.getTime() && guard < 1000) {
    next = advanceOnce(next, frequency)
    guard++
  }
  return next
}

function frequencyLabel(freq: Frequency): string {
  if (freq === "daily") return "Zilnic"
  if (freq === "weekly") return "Săptămânal"
  return "Lunar"
}

export const reportScheduleDeliverFunction = inngest.createFunction(
  {
    id: "prv-report-schedule-deliver",
    name: "Scheduled Report Delivery — Hourly",
    retries: 2,
    concurrency: { limit: 3 },
  },
  { cron: "0 * * * *" }, // top of every hour
  async ({ step }) => {
    const due = await step.run("fetch-due-schedules", async () => {
      const { db } = await import("@prv/db")
      const { reportSchedules } = await import("@prv/db/schema")
      const { and, eq, lte } = await import("drizzle-orm")
      const now = new Date()
      return db
        .select()
        .from(reportSchedules)
        .where(and(eq(reportSchedules.enabled, true), lte(reportSchedules.nextRunAt, now)))
        .limit(200)
    })

    if (due.length === 0) return { delivered: 0, due: 0 }

    let delivered = 0

    for (const schedule of due) {
      const result = await step.run(`deliver-${schedule.id}`, async () => {
        const { db } = await import("@prv/db")
        const { reportSchedules, kpiDailySnapshots, companies } = await import("@prv/db/schema")
        const { eq, desc } = await import("drizzle-orm")

        const now = new Date()
        const frequency = schedule.frequency as Frequency
        const recipients = Array.isArray(schedule.recipients)
          ? (schedule.recipients as string[])
          : []

        let status: "ok" | "error" = "ok"
        let errorMsg: string | null = null
        let sent = false

        try {
          if (recipients.length === 0) throw new Error("No recipients configured")

          const [company] = await db
            .select({ name: companies.name })
            .from(companies)
            .where(eq(companies.id, schedule.companyId))
            .limit(1)

          const [snap] = await db
            .select()
            .from(kpiDailySnapshots)
            .where(eq(kpiDailySnapshots.companyId, schedule.companyId))
            .orderBy(desc(kpiDailySnapshots.snapshotDate))
            .limit(1)

          if (!snap) throw new Error("No KPI snapshot available yet")

          const { reportDigestEmail, sendEmail, EmailFrom } = await import("@prv/email")

          const taskCompletionPct =
            snap.totalTasks > 0 ? Math.round((snap.doneTasks / snap.totalTasks) * 100) : 0

          const { subject, html } = reportDigestEmail({
            companyName: company?.name ?? "Compania",
            scheduleName: schedule.name,
            frequencyLabel: frequencyLabel(frequency),
            periodLabel: snap.snapshotDate,
            kpis: {
              revenueMonth: snap.revenueMonth,
              grossProfit: snap.grossProfit,
              activeProjects: snap.activeProjects,
              taskCompletionPct,
              headcount: snap.headcount,
              presentToday: snap.presentToday,
              activeClients: snap.activeClients,
              pipelineValue: snap.pipelineValue,
              shopOrders: snap.shopOrders,
              healthScore: snap.healthScore,
            },
          })

          await sendEmail({
            to: recipients,
            subject,
            html,
            from: EmailFrom.NOTIFICATIONS,
            tags: [{ name: "type", value: "report_digest" }],
          })
          sent = true
        } catch (e) {
          status = "error"
          errorMsg = e instanceof Error ? e.message : "Unknown error"
        }

        const nextRunAt = computeNextRun(new Date(schedule.nextRunAt), frequency, now)

        await db
          .update(reportSchedules)
          .set({
            lastRunAt: now,
            lastStatus: status,
            lastError: errorMsg,
            nextRunAt,
            updatedAt: now,
          })
          .where(eq(reportSchedules.id, schedule.id))

        return sent
      })
      if (result) delivered++
    }

    return { delivered, due: due.length }
  }
)
