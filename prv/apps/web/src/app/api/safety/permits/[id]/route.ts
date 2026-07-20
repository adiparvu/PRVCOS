import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { safetyPermits, users, projects, permitEvents } from "@prv/db/schema"
import { aliasedTable, and, asc, eq } from "drizzle-orm"
import { z } from "zod"
import {
  allowedActionsForValidity,
  effectivePermitStatus,
  type PermitAction,
  type PermitActor,
  type PermitStatus,
  type PermitType,
} from "@/lib/ptw"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface PermitDetail {
  id: string
  type: PermitType
  status: PermitStatus
  effectiveStatus: PermitStatus
  title: string
  description: string
  location: string | null
  projectId: string | null
  projectName: string | null
  validFrom: string
  validTo: string
  riskAssessment: { hazard: string; control: string; residualRisk: string }[]
  ppe: string[]
  typeDetails: Record<string, unknown>
  requestedBy: string
  requesterName: string | null
  supervisorId: string | null
  supervisorName: string | null
  safetyOfficerId: string | null
  safetyOfficerName: string | null
  supervisorApprovedAt: string | null
  safetyOfficerApprovedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  activatedAt: string | null
  closedAt: string | null
  closeOutNotes: string | null
  suspendedAt: string | null
  suspensionReason: string | null
  reinstatedAt: string | null
  revokedAt: string | null
  revocationReason: string | null
  createdAt: string
  allowedActions: PermitAction[]
  canEdit: boolean
  events: {
    action: string
    fromStatus: string | null
    toStatus: string
    actorName: string | null
    reason: string | null
    at: string
  }[]
}

function permitId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").pop() ?? ""
}

const sup = aliasedTable(users, "sup")
const off = aliasedTable(users, "off")

export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const id = permitId(req)

    const [row] = await db
      .select({
        p: safetyPermits,
        reqFirst: users.firstName,
        reqLast: users.lastName,
        supFirst: sup.firstName,
        supLast: sup.lastName,
        offFirst: off.firstName,
        offLast: off.lastName,
        projectName: projects.name,
      })
      .from(safetyPermits)
      .leftJoin(users, eq(safetyPermits.requestedBy, users.id))
      .leftJoin(sup, eq(safetyPermits.supervisorId, sup.id))
      .leftJoin(off, eq(safetyPermits.safetyOfficerId, off.id))
      .leftJoin(projects, eq(safetyPermits.projectId, projects.id))
      .where(and(eq(safetyPermits.id, id), eq(safetyPermits.companyId, companyId)))
      .limit(1)

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const p = row.p
    const eventRows = await db
      .select({
        action: permitEvents.action,
        fromStatus: permitEvents.fromStatus,
        toStatus: permitEvents.toStatus,
        reason: permitEvents.reason,
        createdAt: permitEvents.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(permitEvents)
      .leftJoin(users, eq(permitEvents.actorId, users.id))
      .where(eq(permitEvents.permitId, p.id))
      .orderBy(asc(permitEvents.createdAt))
    const ADMIN_ROLES = new Set(["group_ceo", "ceo", "co_ceo", "system_administrator"])
    const actor: PermitActor = {
      isRequester: p.requestedBy === ctx.session.userId,
      isSupervisor: p.supervisorId === ctx.session.userId,
      isSafetyOfficer: p.safetyOfficerId === ctx.session.userId,
      isAdmin: ADMIN_ROLES.has(ctx.session.role),
    }
    const canEdit = p.status === "draft" && (actor.isRequester || actor.isAdmin)
    const name = (f: string | null, l: string | null) => (f && l ? `${f} ${l}` : null)
    const detail: PermitDetail = {
      id: p.id,
      type: p.type,
      status: p.status,
      effectiveStatus: effectivePermitStatus(p.status, p.validTo.getTime(), Date.now()),
      title: p.title,
      description: p.description,
      location: p.location,
      projectId: p.projectId,
      projectName: row.projectName ?? null,
      validFrom: p.validFrom.toISOString(),
      validTo: p.validTo.toISOString(),
      riskAssessment: p.riskAssessment ?? [],
      ppe: p.ppe ?? [],
      typeDetails: p.typeDetails ?? {},
      requestedBy: p.requestedBy,
      requesterName: name(row.reqFirst, row.reqLast),
      supervisorId: p.supervisorId,
      supervisorName: name(row.supFirst, row.supLast),
      safetyOfficerId: p.safetyOfficerId,
      safetyOfficerName: name(row.offFirst, row.offLast),
      supervisorApprovedAt: p.supervisorApprovedAt?.toISOString() ?? null,
      safetyOfficerApprovedAt: p.safetyOfficerApprovedAt?.toISOString() ?? null,
      rejectedAt: p.rejectedAt?.toISOString() ?? null,
      rejectionReason: p.rejectionReason,
      activatedAt: p.activatedAt?.toISOString() ?? null,
      closedAt: p.closedAt?.toISOString() ?? null,
      closeOutNotes: p.closeOutNotes,
      suspendedAt: p.suspendedAt?.toISOString() ?? null,
      suspensionReason: p.suspensionReason,
      reinstatedAt: p.reinstatedAt?.toISOString() ?? null,
      revokedAt: p.revokedAt?.toISOString() ?? null,
      revocationReason: p.revocationReason,
      createdAt: p.createdAt.toISOString(),
      allowedActions: allowedActionsForValidity(p.status, actor, p.validTo.getTime(), Date.now()),
      canEdit,
      events: eventRows.map((e) => ({
        action: e.action,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        actorName: e.firstName && e.lastName ? `${e.firstName} ${e.lastName}` : null,
        reason: e.reason,
        at: e.createdAt.toISOString(),
      })),
    }
    return NextResponse.json(detail)
  }
)

// ─── PATCH — edit editable fields, only while draft ───────────────────────────
const riskRowSchema = z.object({
  hazard: z.string().min(1).max(500),
  control: z.string().min(1).max(500),
  residualRisk: z.enum(["low", "medium", "high"]),
})
const patchSchema = z
  .object({
    title: z.string().min(1).max(300).optional(),
    description: z.string().min(1).max(4000).optional(),
    location: z.string().max(300).nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
    supervisorId: z.string().uuid().nullable().optional(),
    safetyOfficerId: z.string().uuid().nullable().optional(),
    validFrom: z.string().datetime().optional(),
    validTo: z.string().datetime().optional(),
    riskAssessment: z.array(riskRowSchema).max(50).optional(),
    ppe: z.array(z.string().max(100)).max(30).optional(),
    typeDetails: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field required" })

export const PATCH = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = permitId(req)
    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const [existing] = await db
      .select({
        id: safetyPermits.id,
        status: safetyPermits.status,
        requestedBy: safetyPermits.requestedBy,
      })
      .from(safetyPermits)
      .where(and(eq(safetyPermits.id, id), eq(safetyPermits.companyId, companyId)))
      .limit(1)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const PATCH_ADMIN_ROLES = new Set(["group_ceo", "ceo", "co_ceo", "system_administrator"])
    if (existing.requestedBy !== userId && !PATCH_ADMIN_ROLES.has(ctx.session.role))
      return NextResponse.json(
        { error: "Only the requester can edit this permit" },
        { status: 403 }
      )
    if (existing.status !== "draft")
      return NextResponse.json({ error: "Only draft permits can be edited" }, { status: 409 })

    const d = parsed.data
    const [updated] = await db
      .update(safetyPermits)
      .set({
        ...(d.title !== undefined && { title: d.title }),
        ...(d.description !== undefined && { description: d.description }),
        ...(d.location !== undefined && { location: d.location }),
        ...(d.projectId !== undefined && { projectId: d.projectId }),
        ...(d.supervisorId !== undefined && { supervisorId: d.supervisorId }),
        ...(d.safetyOfficerId !== undefined && { safetyOfficerId: d.safetyOfficerId }),
        ...(d.validFrom !== undefined && { validFrom: new Date(d.validFrom) }),
        ...(d.validTo !== undefined && { validTo: new Date(d.validTo) }),
        ...(d.riskAssessment !== undefined && { riskAssessment: d.riskAssessment }),
        ...(d.ppe !== undefined && { ppe: d.ppe }),
        ...(d.typeDetails !== undefined && { typeDetails: d.typeDetails }),
        updatedAt: new Date(),
      })
      .where(and(eq(safetyPermits.id, id), eq(safetyPermits.companyId, companyId)))
      .returning({ id: safetyPermits.id })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "safety.permit.update",
      entityType: "safety_permit",
      entityId: id,
      payload: { changes: Object.keys(d) },
      method: "PATCH",
      path: `/api/safety/permits/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)
