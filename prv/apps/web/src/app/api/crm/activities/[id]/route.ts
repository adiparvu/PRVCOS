import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { crmActivities } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function id(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

// PATCH /api/crm/activities/[id] — complete an activity (records outcome +
// completedAt), reopen it, or edit its subject/notes/due date.
const patchSchema = z.object({
  completed: z.boolean().optional(),
  outcome: z.string().max(4000).nullable().optional(),
  subject: z.string().min(1).max(255).optional(),
  notes: z.string().max(4000).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
})

export const PATCH = withGates(
  { action: "crm.leads.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (d.subject !== undefined) update.subject = d.subject
    if (d.notes !== undefined) update.notes = d.notes
    if (d.outcome !== undefined) update.outcome = d.outcome
    if (d.dueAt !== undefined) update.dueAt = d.dueAt ? new Date(d.dueAt) : null
    if (d.completed !== undefined) update.completedAt = d.completed ? new Date() : null

    const [updated] = await db
      .update(crmActivities)
      .set(update)
      .where(and(eq(crmActivities.id, rowId), eq(crmActivities.companyId, companyId)))
      .returning({ id: crmActivities.id, completedAt: crmActivities.completedAt })
    if (!updated) return NextResponse.json({ error: "Activity not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "crm.activity.update",
      entityType: "crm_activity",
      entityId: rowId,
      payload: { completed: d.completed },
      method: "PATCH",
      path: `/api/crm/activities/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated.id, completedAt: updated.completedAt })
  }
)

// DELETE /api/crm/activities/[id] — remove an activity.
export const DELETE = withGates(
  { action: "crm.leads.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })
    const { companyId, userId: actorId, sessionId } = ctx.session

    const [deleted] = await db
      .delete(crmActivities)
      .where(and(eq(crmActivities.id, rowId), eq(crmActivities.companyId, companyId)))
      .returning({ id: crmActivities.id })
    if (!deleted) return NextResponse.json({ error: "Activity not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "crm.activity.delete",
      entityType: "crm_activity",
      entityId: rowId,
      payload: {},
      method: "DELETE",
      path: `/api/crm/activities/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: deleted.id })
  }
)
