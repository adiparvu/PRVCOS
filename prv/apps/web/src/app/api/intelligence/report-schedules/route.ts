import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { reportSchedules } from "@prv/db/schema"
import { desc, eq } from "drizzle-orm"
import { z } from "zod"
import { computeInitialRun, isReportFrequency } from "@/lib/report-schedule"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ReportScheduleDto {
  id: string
  name: string
  frequency: "daily" | "weekly" | "monthly"
  sendHourUtc: number
  recipients: string[]
  enabled: boolean
  nextRunAt: string
  lastRunAt: string | null
  lastStatus: string | null
  lastError: string | null
  createdAt: string
}

function toDto(r: typeof reportSchedules.$inferSelect): ReportScheduleDto {
  return {
    id: r.id,
    name: r.name,
    frequency: r.frequency,
    sendHourUtc: r.sendHourUtc,
    recipients: Array.isArray(r.recipients) ? (r.recipients as string[]) : [],
    enabled: r.enabled,
    nextRunAt: r.nextRunAt.toISOString(),
    lastRunAt: r.lastRunAt?.toISOString() ?? null,
    lastStatus: r.lastStatus,
    lastError: r.lastError,
    createdAt: r.createdAt.toISOString(),
  }
}

// ─── GET /api/intelligence/report-schedules ───────────────────────────────────
export const GET = withGates(
  { action: "intelligence.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rows = await db
      .select()
      .from(reportSchedules)
      .where(eq(reportSchedules.companyId, ctx.session.companyId))
      .orderBy(desc(reportSchedules.createdAt))
      .limit(100)
    return NextResponse.json({ schedules: rows.map(toDto) })
  }
)

// ─── POST /api/intelligence/report-schedules ──────────────────────────────────
const createSchema = z.object({
  name: z.string().min(1).max(200),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  sendHourUtc: z.number().int().min(0).max(23).optional(),
  recipients: z.array(z.string().email()).min(1).max(50),
})

export const POST = withGates(
  { action: "intelligence.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = createSchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    if (!isReportFrequency(parsed.data.frequency))
      return NextResponse.json({ error: "Invalid frequency" }, { status: 422 })

    const sendHourUtc = parsed.data.sendHourUtc ?? 7
    // Dedupe recipients case-insensitively while preserving order.
    const seen = new Set<string>()
    const recipients = parsed.data.recipients.filter((e) => {
      const k = e.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })

    const nextRunAt = computeInitialRun(new Date(), sendHourUtc)

    const [created] = await db
      .insert(reportSchedules)
      .values({
        companyId,
        createdByUserId: userId,
        name: parsed.data.name,
        frequency: parsed.data.frequency,
        sendHourUtc,
        recipients,
        nextRunAt,
      })
      .returning()

    if (!created) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "intelligence.report_schedule.create",
      entityType: "report_schedule",
      entityId: created.id,
      payload: { name: created.name, frequency: created.frequency, recipients: recipients.length },
      method: "POST",
      path: "/api/intelligence/report-schedules",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(toDto(created), { status: 201 })
  }
)
