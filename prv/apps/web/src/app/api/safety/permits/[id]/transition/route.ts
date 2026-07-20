import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { safetyPermits, notifications, permitEvents, permitDesignations } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import {
  approverSeparationErrors,
  canAct,
  canTransition,
  FORWARD_ACTIONS,
  isExpiredWindow,
  permitNotificationRecipients,
  resolvePermitActor,
  validatePermitForSubmit,
  type PermitAction,
} from "@/lib/ptw"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// Elevated roles may act at any stage as a fallback for the assigned approver.
const ADMIN_ROLES = new Set(["group_ceo", "ceo", "co_ceo", "system_administrator"])

function permitId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  return parts[parts.indexOf("permits") + 1] ?? ""
}

const bodySchema = z.object({
  action: z.enum([
    "submit",
    "approve",
    "reject",
    "activate",
    "close",
    "suspend",
    "reinstate",
    "revoke",
  ]),
  reason: z.string().max(2000).optional(),
  closeOutNotes: z.string().max(2000).optional(),
})

// POST /api/safety/permits/[id]/transition — the permit stage engine.
export const POST = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId, role } = ctx.session
    const id = permitId(req)

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 })
    const action = parsed.data.action as PermitAction

    const [permit] = await db
      .select()
      .from(safetyPermits)
      .where(and(eq(safetyPermits.id, id), eq(safetyPermits.companyId, companyId)))
      .limit(1)
    if (!permit) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const myDesignations = await db
      .select({ role: permitDesignations.role })
      .from(permitDesignations)
      .where(
        and(eq(permitDesignations.userId, userId), eq(permitDesignations.companyId, companyId))
      )
    const actor = resolvePermitActor({
      userId,
      isAdmin: ADMIN_ROLES.has(role),
      requestedBy: permit.requestedBy,
      supervisorId: permit.supervisorId,
      safetyOfficerId: permit.safetyOfficerId,
      designations: myDesignations.map((d) => d.role),
    })

    const transition = canTransition(permit.status, action)
    if (!transition.ok || !transition.to)
      return NextResponse.json(
        { error: transition.reason ?? "Illegal transition" },
        { status: 409 }
      )

    if (!canAct(permit.status, action, actor))
      return NextResponse.json(
        { error: "You are not authorized to perform this action at this stage" },
        { status: 403 }
      )

    // Forward progress is blocked once the validity window has elapsed (an expired
    // permit can still be rejected or closed out, but not advanced/activated).
    if (FORWARD_ACTIONS.includes(action) && isExpiredWindow(permit.validTo.getTime(), Date.now()))
      return NextResponse.json(
        { error: "Permit validity window has already passed" },
        { status: 409 }
      )

    // Submitting also enforces the completeness gate.
    if (action === "submit") {
      const errors = [
        ...validatePermitForSubmit({
          type: permit.type,
          validFromMs: permit.validFrom.getTime(),
          validToMs: permit.validTo.getTime(),
          riskAssessment: permit.riskAssessment ?? [],
          typeDetails: permit.typeDetails ?? {},
        }),
        // Separation of duties: distinct, assigned supervisor and safety officer.
        ...approverSeparationErrors(
          permit.requestedBy,
          permit.supervisorId,
          permit.safetyOfficerId
        ),
      ]
      if (errors.length > 0)
        return NextResponse.json({ error: "Permit incomplete", issues: errors }, { status: 422 })
    }

    if (
      (action === "reject" || action === "suspend" || action === "revoke") &&
      !parsed.data.reason?.trim()
    )
      return NextResponse.json({ error: "A reason is required for this action" }, { status: 422 })

    const now = new Date()
    const set: Record<string, unknown> = { status: transition.to, updatedAt: now }

    if (action === "approve" && permit.status === "pending_supervisor") {
      set.supervisorApprovedBy = userId
      set.supervisorApprovedAt = now
    } else if (action === "approve" && permit.status === "pending_safety_officer") {
      set.safetyOfficerApprovedBy = userId
      set.safetyOfficerApprovedAt = now
    } else if (action === "reject") {
      set.rejectedBy = userId
      set.rejectedAt = now
      set.rejectionReason = parsed.data.reason?.trim() ?? null
    } else if (action === "activate") {
      set.activatedBy = userId
      set.activatedAt = now
    } else if (action === "close") {
      set.closedBy = userId
      set.closedAt = now
      set.closeOutNotes = parsed.data.closeOutNotes?.trim() ?? null
    } else if (action === "suspend") {
      set.suspendedBy = userId
      set.suspendedAt = now
      set.suspensionReason = parsed.data.reason?.trim() ?? null
    } else if (action === "reinstate") {
      set.reinstatedBy = userId
      set.reinstatedAt = now
    } else if (action === "revoke") {
      set.revokedBy = userId
      set.revokedAt = now
      set.revocationReason = parsed.data.reason?.trim() ?? null
    }

    const [updated] = await db
      .update(safetyPermits)
      .set(set)
      .where(and(eq(safetyPermits.id, id), eq(safetyPermits.companyId, companyId)))
      .returning({ id: safetyPermits.id, status: safetyPermits.status })

    // Append-only stage history for the in-app timeline.
    await db.insert(permitEvents).values({
      companyId,
      permitId: id,
      actorId: userId,
      action,
      fromStatus: permit.status,
      toStatus: transition.to,
      reason: parsed.data.reason?.trim() ?? parsed.data.closeOutNotes?.trim() ?? null,
    })

    // Notify the next actor / requester of the stage change (in-app), skipping the
    // acting user and de-duplicating recipients.
    const notices = permitNotificationRecipients(action, transition.to, {
      title: permit.title,
      requestedBy: permit.requestedBy,
      supervisorId: permit.supervisorId,
      safetyOfficerId: permit.safetyOfficerId,
    })
    const seen = new Set<string>([userId])
    const notifRows = notices
      .filter((n) => !seen.has(n.userId) && (seen.add(n.userId), true))
      .map((n) => ({
        userId: n.userId,
        companyId,
        type: "action_required" as const,
        title: n.title,
        actionUrl: `/safety/permits/${id}`,
        entityType: "safety_permit",
        entityId: id,
      }))
    if (notifRows.length > 0) await db.insert(notifications).values(notifRows)

    // Critical-alert producer (Phase 14.5): revoking or suspending a permit is an
    // emergency stop-work — the requester gets a requiresAck critical alert so it
    // shows as a persistent banner (and escalates if unacknowledged). Recipient is
    // the explicit permit requester; skipped when they performed the action.
    if ((action === "revoke" || action === "suspend") && permit.requestedBy !== userId) {
      await db.insert(notifications).values({
        userId: permit.requestedBy,
        companyId,
        type: "error",
        channel: "in_app",
        title: `Permis ${action === "revoke" ? "revocat" : "suspendat"}: ${permit.title}`.slice(
          0,
          500
        ),
        body: `Lucrul sub acest permis trebuie oprit imediat. Motiv: ${
          parsed.data.reason?.trim() ?? "—"
        }`,
        entityType: "safety_permit",
        entityId: id,
        actionUrl: `/safety/permits/${id}`,
        requiresAck: true,
        deliveredAt: now,
      })
    }

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "safety.permit.transition",
      entityType: "safety_permit",
      entityId: id,
      payload: { action, fromStatus: permit.status, toStatus: transition.to },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)
