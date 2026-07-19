import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { reportSchedules, kpiDailySnapshots, companies } from "@prv/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { reportDigestEmail, sendEmail, EmailFrom } from "@prv/email"
import { frequencyLabel, type ReportFrequency } from "@/lib/report-schedule"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ─── POST /api/intelligence/report-schedules/[id]/run-now ─────────────────────
// Send the report immediately (e.g. to verify recipients/format) without waiting
// for the hourly cron. Does NOT alter the schedule's next_run_at.
export const POST = withGates(
  { action: "intelligence.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").at(-2) ?? ""

    const [schedule] = await db
      .select()
      .from(reportSchedules)
      .where(and(eq(reportSchedules.id, id), eq(reportSchedules.companyId, companyId)))
      .limit(1)
    if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const recipients = Array.isArray(schedule.recipients) ? (schedule.recipients as string[]) : []
    if (recipients.length === 0)
      return NextResponse.json({ error: "No recipients configured" }, { status: 422 })

    const [company] = await db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1)

    const [snap] = await db
      .select()
      .from(kpiDailySnapshots)
      .where(eq(kpiDailySnapshots.companyId, companyId))
      .orderBy(desc(kpiDailySnapshots.snapshotDate))
      .limit(1)
    if (!snap) return NextResponse.json({ error: "No KPI snapshot available yet" }, { status: 409 })

    const taskCompletionPct =
      snap.totalTasks > 0 ? Math.round((snap.doneTasks / snap.totalTasks) * 100) : 0

    const { subject, html } = reportDigestEmail({
      companyName: company?.name ?? "Compania",
      scheduleName: schedule.name,
      frequencyLabel: frequencyLabel(schedule.frequency as ReportFrequency),
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

    try {
      await sendEmail({
        to: recipients,
        subject,
        html,
        from: EmailFrom.NOTIFICATIONS,
        tags: [{ name: "type", value: "report_digest_manual" }],
      })
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Send failed" },
        { status: 502 }
      )
    }

    await db
      .update(reportSchedules)
      .set({ lastRunAt: new Date(), lastStatus: "ok", lastError: null, updatedAt: new Date() })
      .where(eq(reportSchedules.id, id))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "intelligence.report_schedule.run_now",
      entityType: "report_schedule",
      entityId: id,
      payload: { recipients: recipients.length },
      method: "POST",
      path: `/api/intelligence/report-schedules/${id}/run-now`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ sent: true, recipients: recipients.length })
  }
)
