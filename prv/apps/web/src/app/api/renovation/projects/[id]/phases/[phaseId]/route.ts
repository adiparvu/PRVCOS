import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { renovationPhases, renovationProjects, renovationTasks, users } from "@prv/db/schema"
import { and, count, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  return { projectId: parts.at(-3) ?? "", phaseId: parts.at(-1) ?? "" }
}

async function resolvePhase(projectId: string, phaseId: string, companyId: string) {
  const [project] = await db
    .select({ id: renovationProjects.id })
    .from(renovationProjects)
    .where(
      and(
        eq(renovationProjects.id, projectId),
        eq(renovationProjects.companyId, companyId),
        isNull(renovationProjects.deletedAt)
      )
    )
    .limit(1)
  if (!project) return null

  const [phase] = await db
    .select()
    .from(renovationPhases)
    .where(and(eq(renovationPhases.id, phaseId), eq(renovationPhases.projectId, projectId)))
    .limit(1)

  return phase ?? null
}

// ── GET /api/renovation/projects/[id]/phases/[phaseId] ───────────────────────

export const GET = withGates(
  { action: "renovation.projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, phaseId } = ids(req)
    const { companyId } = ctx.session

    const phase = await resolvePhase(projectId, phaseId, companyId)
    if (!phase) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [[taskCount], supervisorRows] = await Promise.all([
      db
        .select({ cnt: count() })
        .from(renovationTasks)
        .where(and(eq(renovationTasks.phaseId, phaseId), isNull(renovationTasks.deletedAt))),

      phase.supervisorId
        ? db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, phase.supervisorId))
            .limit(1)
        : Promise.resolve([] as { firstName: string; lastName: string }[]),
    ])

    return NextResponse.json({
      phase: {
        ...phase,
        estimatedCost: phase.estimatedCost ? Number(phase.estimatedCost) : null,
        actualCost: phase.actualCost ? Number(phase.actualCost) : null,
        supervisorName: supervisorRows[0]
          ? `${supervisorRows[0].firstName} ${supervisorRows[0].lastName}`
          : null,
        taskCount: taskCount?.cnt ?? 0,
      },
    })
  }
)

// ── PATCH /api/renovation/projects/[id]/phases/[phaseId] ─────────────────────

const patchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "paused", "completed", "cancelled"]).optional(),
  plannedStartDate: z.string().nullable().optional(),
  plannedEndDate: z.string().nullable().optional(),
  actualStartDate: z.string().nullable().optional(),
  actualEndDate: z.string().nullable().optional(),
  estimatedCost: z.number().nonnegative().nullable().optional(),
  actualCost: z.number().nonnegative().nullable().optional(),
  completionPercentage: z.number().int().min(0).max(100).optional(),
  requiresClientApproval: z.boolean().optional(),
  supervisorId: z.string().uuid().nullable().optional(),
  lexorank: z.string().optional(),
})

export const PATCH = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, phaseId } = ids(req)
    const { companyId, userId, sessionId } = ctx.session

    const phase = await resolvePhase(projectId, phaseId, companyId)
    if (!phase) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 })

    const { estimatedCost, actualCost, ...rest } = parsed.data

    const [updated] = await db
      .update(renovationPhases)
      .set({
        ...rest,
        ...(estimatedCost !== undefined ? { estimatedCost: estimatedCost !== null ? String(estimatedCost) : null } : {}),
        ...(actualCost !== undefined ? { actualCost: actualCost !== null ? String(actualCost) : null } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(renovationPhases.id, phaseId), eq(renovationPhases.projectId, projectId)))
      .returning({ id: renovationPhases.id, title: renovationPhases.title, status: renovationPhases.status })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "renovation.phases.update",
      entityType: "renovation_phase",
      entityId: phaseId,
      payload: parsed.data,
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ── DELETE /api/renovation/projects/[id]/phases/[phaseId] ────────────────────
// Hard delete. Blocked when active tasks exist under this phase.

export const DELETE = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, phaseId } = ids(req)
    const { companyId, userId, sessionId } = ctx.session

    const phase = await resolvePhase(projectId, phaseId, companyId)
    if (!phase) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [taskRow] = await db
      .select({ cnt: count() })
      .from(renovationTasks)
      .where(and(eq(renovationTasks.phaseId, phaseId), isNull(renovationTasks.deletedAt)))

    if ((taskRow?.cnt ?? 0) > 0)
      return NextResponse.json(
        { error: "Cannot delete: phase has active tasks" },
        { status: 409 }
      )

    await db
      .delete(renovationPhases)
      .where(and(eq(renovationPhases.id, phaseId), eq(renovationPhases.projectId, projectId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "renovation.phases.delete",
      entityType: "renovation_phase",
      entityId: phaseId,
      payload: { title: phase.title },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
