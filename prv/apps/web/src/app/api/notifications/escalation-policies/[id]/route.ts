import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog, RoleSets } from "@prv/auth"
import { db } from "@prv/db"
import { notificationEscalationPolicies } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function policyId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

// ─── PATCH — toggle active / adjust SLA ───────────────────────────────────────
const patchSchema = z.object({
  isActive: z.boolean().optional(),
  slaMinutes: z.number().int().min(5).max(10080).optional(),
})

export const PATCH = withGates(
  {
    action: "notifications.preferences.update",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session
    const id = policyId(req)

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
    if (parsed.data.isActive === undefined && parsed.data.slaMinutes === undefined)
      return NextResponse.json({ error: "Nothing to update" }, { status: 422 })

    const patch: { isActive?: boolean; slaMinutes?: number; updatedAt: Date } = {
      updatedAt: new Date(),
    }
    if (parsed.data.isActive !== undefined) patch.isActive = parsed.data.isActive
    if (parsed.data.slaMinutes !== undefined) patch.slaMinutes = parsed.data.slaMinutes

    const [updated] = await db
      .update(notificationEscalationPolicies)
      .set(patch)
      .where(
        and(
          eq(notificationEscalationPolicies.id, id),
          eq(notificationEscalationPolicies.companyId, companyId)
        )
      )
      .returning({ id: notificationEscalationPolicies.id })

    if (!updated) return NextResponse.json({ error: "Policy not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "notifications.escalation_policy.update",
      entityType: "notification_escalation_policy",
      entityId: id,
      payload: { ...parsed.data },
      method: "PATCH",
      path: `/api/notifications/escalation-policies/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ updated: true })
  }
)

// ─── DELETE — remove a policy ─────────────────────────────────────────────────
export const DELETE = withGates(
  {
    action: "notifications.preferences.update",
    endpointClass: "api_write",
    requiredRoles: RoleSets.admin,
  },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, sessionId } = ctx.session
    const id = policyId(req)

    const [deleted] = await db
      .delete(notificationEscalationPolicies)
      .where(
        and(
          eq(notificationEscalationPolicies.id, id),
          eq(notificationEscalationPolicies.companyId, companyId)
        )
      )
      .returning({ id: notificationEscalationPolicies.id })

    if (!deleted) return NextResponse.json({ error: "Policy not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "notifications.escalation_policy.delete",
      entityType: "notification_escalation_policy",
      entityId: id,
      payload: {},
      method: "DELETE",
      path: `/api/notifications/escalation-policies/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ deleted: true })
  }
)
