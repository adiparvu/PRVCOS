import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { recurringTasks } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { computeInitialRun } from "@/lib/report-schedule"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function recurringId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").pop() ?? ""
}

const patchSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).nullable().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    estimatedHours: z.number().min(0).nullable().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    sendHourUtc: z.number().int().min(0).max(23).optional(),
    enabled: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field required" })

// ─── PATCH /api/projects/[id]/recurring-tasks/[recurringId] ────────────────────
export const PATCH = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = recurringId(req)
    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const [existing] = await db
      .select()
      .from(recurringTasks)
      .where(and(eq(recurringTasks.id, id), eq(recurringTasks.companyId, companyId)))
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const d = parsed.data
    const cadenceChanged =
      (d.frequency !== undefined && d.frequency !== existing.frequency) ||
      (d.sendHourUtc !== undefined && d.sendHourUtc !== existing.sendHourUtc)
    const nextRunAt = cadenceChanged
      ? computeInitialRun(new Date(), d.sendHourUtc ?? existing.sendHourUtc)
      : undefined

    const [updated] = await db
      .update(recurringTasks)
      .set({
        ...(d.title !== undefined && { title: d.title }),
        ...(d.description !== undefined && { description: d.description }),
        ...(d.priority !== undefined && { priority: d.priority }),
        ...(d.estimatedHours !== undefined && {
          estimatedHours: d.estimatedHours != null ? d.estimatedHours.toFixed(2) : null,
        }),
        ...(d.assigneeId !== undefined && { assigneeId: d.assigneeId }),
        ...(d.frequency !== undefined && { frequency: d.frequency }),
        ...(d.sendHourUtc !== undefined && { sendHourUtc: d.sendHourUtc }),
        ...(d.enabled !== undefined && { enabled: d.enabled }),
        ...(nextRunAt !== undefined && { nextRunAt }),
        updatedAt: new Date(),
      })
      .where(and(eq(recurringTasks.id, id), eq(recurringTasks.companyId, companyId)))
      .returning({ id: recurringTasks.id, enabled: recurringTasks.enabled })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "projects.recurring_task.update",
      entityType: "recurring_task",
      entityId: id,
      payload: { changes: Object.keys(d) },
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/projects/[id]/recurring-tasks/[recurringId] ───────────────────
export const DELETE = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = recurringId(req)

    const [existing] = await db
      .select({ id: recurringTasks.id, title: recurringTasks.title })
      .from(recurringTasks)
      .where(and(eq(recurringTasks.id, id), eq(recurringTasks.companyId, companyId)))
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .delete(recurringTasks)
      .where(and(eq(recurringTasks.id, id), eq(recurringTasks.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "projects.recurring_task.delete",
      entityType: "recurring_task",
      entityId: id,
      payload: { title: existing.title },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
