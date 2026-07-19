import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { reportSchedules } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { computeInitialRun } from "@/lib/report-schedule"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function scheduleId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").pop() ?? ""
}

const patchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    enabled: z.boolean().optional(),
    frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    sendHourUtc: z.number().int().min(0).max(23).optional(),
    recipients: z.array(z.string().email()).min(1).max(50).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field required" })

// ─── PATCH /api/intelligence/report-schedules/[id] ────────────────────────────
export const PATCH = withGates(
  { action: "intelligence.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = scheduleId(req)

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const [existing] = await db
      .select()
      .from(reportSchedules)
      .where(and(eq(reportSchedules.id, id), eq(reportSchedules.companyId, companyId)))
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const d = parsed.data
    // If cadence changed (frequency or send hour), recompute the next run so the
    // change takes effect from the next natural boundary rather than lingering.
    const cadenceChanged =
      (d.frequency !== undefined && d.frequency !== existing.frequency) ||
      (d.sendHourUtc !== undefined && d.sendHourUtc !== existing.sendHourUtc)
    const nextRunAt = cadenceChanged
      ? computeInitialRun(new Date(), d.sendHourUtc ?? existing.sendHourUtc)
      : undefined

    const [updated] = await db
      .update(reportSchedules)
      .set({
        ...(d.name !== undefined && { name: d.name }),
        ...(d.enabled !== undefined && { enabled: d.enabled }),
        ...(d.frequency !== undefined && { frequency: d.frequency }),
        ...(d.sendHourUtc !== undefined && { sendHourUtc: d.sendHourUtc }),
        ...(d.recipients !== undefined && { recipients: d.recipients }),
        ...(nextRunAt !== undefined && { nextRunAt }),
        updatedAt: new Date(),
      })
      .where(and(eq(reportSchedules.id, id), eq(reportSchedules.companyId, companyId)))
      .returning({ id: reportSchedules.id, enabled: reportSchedules.enabled })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "intelligence.report_schedule.update",
      entityType: "report_schedule",
      entityId: id,
      payload: { changes: d },
      method: "PATCH",
      path: `/api/intelligence/report-schedules/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/intelligence/report-schedules/[id] ───────────────────────────
export const DELETE = withGates(
  { action: "intelligence.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = scheduleId(req)

    const [existing] = await db
      .select({ id: reportSchedules.id, name: reportSchedules.name })
      .from(reportSchedules)
      .where(and(eq(reportSchedules.id, id), eq(reportSchedules.companyId, companyId)))
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .delete(reportSchedules)
      .where(and(eq(reportSchedules.id, id), eq(reportSchedules.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "intelligence.report_schedule.delete",
      entityType: "report_schedule",
      entityId: id,
      payload: { name: existing.name },
      method: "DELETE",
      path: `/api/intelligence/report-schedules/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
