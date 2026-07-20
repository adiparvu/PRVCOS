import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { safetyPermits } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import {
  canAct,
  canTransition,
  validatePermitForSubmit,
  type PermitAction,
  type PermitActor,
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
  action: z.enum(["submit", "approve", "reject", "activate", "close"]),
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

    const actor: PermitActor = {
      isRequester: permit.requestedBy === userId,
      isSupervisor: permit.supervisorId === userId,
      isSafetyOfficer: permit.safetyOfficerId === userId,
      isAdmin: ADMIN_ROLES.has(role),
    }

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

    // Submitting also enforces the completeness gate.
    if (action === "submit") {
      const errors = validatePermitForSubmit({
        type: permit.type,
        validFromMs: permit.validFrom.getTime(),
        validToMs: permit.validTo.getTime(),
        riskAssessment: permit.riskAssessment ?? [],
        typeDetails: permit.typeDetails ?? {},
      })
      if (errors.length > 0)
        return NextResponse.json({ error: "Permit incomplete", issues: errors }, { status: 422 })
    }

    if (action === "reject" && !parsed.data.reason?.trim())
      return NextResponse.json({ error: "A rejection reason is required" }, { status: 422 })

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
    }

    const [updated] = await db
      .update(safetyPermits)
      .set(set)
      .where(and(eq(safetyPermits.id, id), eq(safetyPermits.companyId, companyId)))
      .returning({ id: safetyPermits.id, status: safetyPermits.status })

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
