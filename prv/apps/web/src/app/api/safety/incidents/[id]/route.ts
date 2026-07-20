import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { safetyIncidents, users, notifications } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IncidentDetail {
  incident: {
    id: string
    companyId: string
    projectId: string | null
    reportedBy: string
    assignedTo: string | null
    title: string
    description: string
    type: string
    severity: string
    status: string
    location: string | null
    incidentAt: string
    injuriesCount: number
    rootCause: string | null
    correctiveActions: string | null
    closedAt: string | null
    closedBy: string | null
    createdAt: string
    updatedAt: string
  }
  reporter: { id: string; name: string } | null
  assignee: { id: string; name: string } | null
}

// ── GET /api/safety/incidents/[id] ───────────────────────────────────────────

export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const reporterAlias = {
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    }

    const rows = await db
      .select({
        id: safetyIncidents.id,
        companyId: safetyIncidents.companyId,
        projectId: safetyIncidents.projectId,
        reportedBy: safetyIncidents.reportedBy,
        assignedTo: safetyIncidents.assignedTo,
        title: safetyIncidents.title,
        description: safetyIncidents.description,
        type: safetyIncidents.type,
        severity: safetyIncidents.severity,
        status: safetyIncidents.status,
        location: safetyIncidents.location,
        incidentAt: safetyIncidents.incidentAt,
        injuriesCount: safetyIncidents.injuriesCount,
        rootCause: safetyIncidents.rootCause,
        correctiveActions: safetyIncidents.correctiveActions,
        closedAt: safetyIncidents.closedAt,
        closedBy: safetyIncidents.closedBy,
        createdAt: safetyIncidents.createdAt,
        updatedAt: safetyIncidents.updatedAt,
        reporterFirstName: users.firstName,
        reporterLastName: users.lastName,
        reporterId: users.id,
      })
      .from(safetyIncidents)
      .leftJoin(users, eq(safetyIncidents.reportedBy, users.id))
      .where(and(eq(safetyIncidents.id, id), eq(safetyIncidents.companyId, companyId)))
      .limit(1)

    const row = rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Fetch assignee separately if set
    let assignee: { id: string; name: string } | null = null
    if (row.assignedTo) {
      const assigneeRows = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, row.assignedTo))
        .limit(1)
      const a = assigneeRows[0]
      if (a) assignee = { id: a.id, name: `${a.firstName} ${a.lastName}` }
    }

    const detail: IncidentDetail = {
      incident: {
        id: row.id,
        companyId: row.companyId,
        projectId: row.projectId ?? null,
        reportedBy: row.reportedBy,
        assignedTo: row.assignedTo ?? null,
        title: row.title,
        description: row.description,
        type: row.type,
        severity: row.severity,
        status: row.status,
        location: row.location ?? null,
        incidentAt: row.incidentAt.toISOString(),
        injuriesCount: row.injuriesCount,
        rootCause: row.rootCause ?? null,
        correctiveActions: row.correctiveActions ?? null,
        closedAt: row.closedAt ? row.closedAt.toISOString() : null,
        closedBy: row.closedBy ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
      reporter:
        row.reporterId && row.reporterFirstName && row.reporterLastName
          ? { id: row.reporterId, name: `${row.reporterFirstName} ${row.reporterLastName}` }
          : null,
      assignee,
    }

    return NextResponse.json(detail)
  }
)

// ── PATCH /api/safety/incidents/[id] ─────────────────────────────────────────

const patchIncidentSchema = z
  .object({
    assignedTo: z.string().uuid().nullable().optional(),
    status: z.enum(["open", "under_investigation", "resolved", "closed"]).optional(),
    rootCause: z.string().optional(),
    correctiveActions: z.string().optional(),
    title: z.string().min(1).max(300).optional(),
    description: z.string().optional(),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    location: z.string().max(300).nullable().optional(),
  })
  .refine(
    (d) =>
      d.assignedTo !== undefined ||
      d.status !== undefined ||
      d.rootCause !== undefined ||
      d.correctiveActions !== undefined ||
      d.title !== undefined ||
      d.description !== undefined ||
      d.severity !== undefined ||
      d.location !== undefined,
    { message: "At least one field required" }
  )

export const PATCH = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = patchIncidentSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [existing] = await db
      .select({
        id: safetyIncidents.id,
        severity: safetyIncidents.severity,
        title: safetyIncidents.title,
        assignedTo: safetyIncidents.assignedTo,
      })
      .from(safetyIncidents)
      .where(and(eq(safetyIncidents.id, id), eq(safetyIncidents.companyId, companyId)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const d = parsed.data
    const isClosing = d.status === "closed"

    const [updated] = await db
      .update(safetyIncidents)
      .set({
        ...(d.assignedTo !== undefined && { assignedTo: d.assignedTo }),
        ...(d.status !== undefined && { status: d.status }),
        ...(d.rootCause !== undefined && { rootCause: d.rootCause }),
        ...(d.correctiveActions !== undefined && { correctiveActions: d.correctiveActions }),
        ...(d.title !== undefined && { title: d.title }),
        ...(d.description !== undefined && { description: d.description }),
        ...(d.severity !== undefined && { severity: d.severity }),
        ...(d.location !== undefined && { location: d.location }),
        ...(isClosing && { closedAt: new Date(), closedBy: userId }),
        updatedAt: new Date(),
      })
      .where(and(eq(safetyIncidents.id, id), eq(safetyIncidents.companyId, companyId)))
      .returning({ id: safetyIncidents.id, status: safetyIncidents.status })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "safety.incident.update",
      entityType: "safety_incident",
      entityId: id,
      payload: d,
      method: "PATCH",
      path: `/api/safety/incidents/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    // Critical-alert producer (Phase 14.5): a NEW investigator assigned to a
    // 'critical'-severity (emergency) incident gets a requiresAck critical alert.
    // Recipient is the explicit assignee — never guessed. Self-assignment and an
    // unchanged assignee do not fire (the assigner already knows).
    const effectiveSeverity = d.severity ?? existing.severity
    const newAssignee = d.assignedTo !== undefined && d.assignedTo !== null ? d.assignedTo : null
    if (
      newAssignee &&
      newAssignee !== existing.assignedTo &&
      newAssignee !== userId &&
      effectiveSeverity === "critical"
    ) {
      const incidentTitle = d.title ?? existing.title
      await db.insert(notifications).values({
        userId: newAssignee,
        companyId,
        type: "error",
        channel: "in_app",
        title: `Incident critic alocat: ${incidentTitle}`.slice(0, 500),
        body: `Ai fost desemnat investigator pentru un incident de severitate critică. Necesită atenția ta imediată.`,
        entityType: "safety_incident",
        entityId: id,
        actionUrl: `/safety/incidents/${id}`,
        requiresAck: true,
        deliveredAt: new Date(),
      })
    }

    return NextResponse.json(updated)
  }
)
