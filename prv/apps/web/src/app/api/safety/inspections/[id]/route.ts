import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { safetyInspections, users, projects } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InspectionDetail {
  inspection: {
    id: string
    companyId: string
    projectId: string | null
    assignedTo: string | null
    createdBy: string
    title: string
    description: string | null
    status: string
    scheduledAt: string
    completedAt: string | null
    nextDueDate: string | null
    score: number | null
    maxScore: number | null
    notes: string | null
    recurrenceWeeks: number | null
    createdAt: string
    updatedAt: string
  }
  assignee: { id: string; name: string } | null
  project: { id: string; name: string } | null
}

// ── GET /api/safety/inspections/[id] ─────────────────────────────────────────

export const GET = withGates(
  { action: "safety.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const rows = await db
      .select({
        id: safetyInspections.id,
        companyId: safetyInspections.companyId,
        projectId: safetyInspections.projectId,
        assignedTo: safetyInspections.assignedTo,
        createdBy: safetyInspections.createdBy,
        title: safetyInspections.title,
        description: safetyInspections.description,
        status: safetyInspections.status,
        scheduledAt: safetyInspections.scheduledAt,
        completedAt: safetyInspections.completedAt,
        nextDueDate: safetyInspections.nextDueDate,
        score: safetyInspections.score,
        maxScore: safetyInspections.maxScore,
        notes: safetyInspections.notes,
        recurrenceWeeks: safetyInspections.recurrenceWeeks,
        createdAt: safetyInspections.createdAt,
        updatedAt: safetyInspections.updatedAt,
      })
      .from(safetyInspections)
      .where(and(eq(safetyInspections.id, id), eq(safetyInspections.companyId, companyId)))
      .limit(1)

    const row = rows[0]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Fetch assignee and project in parallel if set
    const [assigneeRows, projectRows] = await Promise.all([
      row.assignedTo
        ? db
            .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, row.assignedTo))
            .limit(1)
        : Promise.resolve([]),
      row.projectId
        ? db
            .select({ id: projects.id, name: projects.name })
            .from(projects)
            .where(eq(projects.id, row.projectId))
            .limit(1)
        : Promise.resolve([]),
    ])

    const assigneeRow = assigneeRows[0]
    const projectRow = projectRows[0]

    const detail: InspectionDetail = {
      inspection: {
        id: row.id,
        companyId: row.companyId,
        projectId: row.projectId ?? null,
        assignedTo: row.assignedTo ?? null,
        createdBy: row.createdBy,
        title: row.title,
        description: row.description ?? null,
        status: row.status,
        scheduledAt: row.scheduledAt.toISOString(),
        completedAt: row.completedAt ? row.completedAt.toISOString() : null,
        nextDueDate: row.nextDueDate ? row.nextDueDate.toISOString() : null,
        score: row.score ?? null,
        maxScore: row.maxScore ?? null,
        notes: row.notes ?? null,
        recurrenceWeeks: row.recurrenceWeeks ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
      assignee: assigneeRow
        ? { id: assigneeRow.id, name: `${assigneeRow.firstName} ${assigneeRow.lastName}` }
        : null,
      project: projectRow ? { id: projectRow.id, name: projectRow.name } : null,
    }

    return NextResponse.json(detail)
  }
)

// ── PATCH /api/safety/inspections/[id] ───────────────────────────────────────

const patchInspectionSchema = z
  .object({
    status: z.enum(["scheduled", "in_progress", "completed", "overdue"]).optional(),
    score: z.number().nonnegative().optional(),
    maxScore: z.number().nonnegative().optional(),
    completedAt: z.string().datetime().optional(),
    notes: z.string().optional(),
    nextDueDate: z.string().datetime().optional(),
    assignedTo: z.string().uuid().nullable().optional(),
    title: z.string().min(1).max(300).optional(),
  })
  .refine(
    (d) =>
      d.status !== undefined ||
      d.score !== undefined ||
      d.maxScore !== undefined ||
      d.completedAt !== undefined ||
      d.notes !== undefined ||
      d.nextDueDate !== undefined ||
      d.assignedTo !== undefined ||
      d.title !== undefined,
    { message: "At least one field required" }
  )

export const PATCH = withGates(
  { action: "safety.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const id = req.nextUrl.pathname.split("/").pop()
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const raw = await req.json().catch(() => ({}))
    const parsed = patchInspectionSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const [existing] = await db
      .select({ id: safetyInspections.id })
      .from(safetyInspections)
      .where(and(eq(safetyInspections.id, id), eq(safetyInspections.companyId, companyId)))
      .limit(1)

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const d = parsed.data
    const isCompleting = d.status === "completed"

    const [updated] = await db
      .update(safetyInspections)
      .set({
        ...(d.status !== undefined && { status: d.status }),
        ...(d.score !== undefined && { score: d.score }),
        ...(d.maxScore !== undefined && { maxScore: d.maxScore }),
        ...(d.completedAt !== undefined && { completedAt: new Date(d.completedAt) }),
        ...(d.notes !== undefined && { notes: d.notes }),
        ...(d.nextDueDate !== undefined && { nextDueDate: new Date(d.nextDueDate) }),
        ...(d.assignedTo !== undefined && { assignedTo: d.assignedTo }),
        ...(d.title !== undefined && { title: d.title }),
        ...(isCompleting && !d.completedAt && { completedAt: new Date() }),
        updatedAt: new Date(),
      })
      .where(and(eq(safetyInspections.id, id), eq(safetyInspections.companyId, companyId)))
      .returning({ id: safetyInspections.id, status: safetyInspections.status })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "safety.inspection.update",
      entityType: "safety_inspection",
      entityId: id,
      payload: d,
      method: "PATCH",
      path: `/api/safety/inspections/${id}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)
