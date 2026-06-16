import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { renovationTasks, renovationProjects, users } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function ids(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/")
  return { projectId: parts.at(-3) ?? "", taskId: parts.at(-1) ?? "" }
}

async function resolveTask(projectId: string, taskId: string, companyId: string) {
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

  const [task] = await db
    .select()
    .from(renovationTasks)
    .where(
      and(
        eq(renovationTasks.id, taskId),
        eq(renovationTasks.projectId, projectId),
        isNull(renovationTasks.deletedAt)
      )
    )
    .limit(1)

  return task ?? null
}

// ── GET /api/renovation/projects/[id]/tasks/[taskId] ─────────────────────────

export const GET = withGates(
  { action: "renovation.projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, taskId } = ids(req)
    const { companyId } = ctx.session

    const task = await resolveTask(projectId, taskId, companyId)
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [assigneeRows] = await Promise.all([
      task.assignedTo
        ? db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.id, task.assignedTo))
            .limit(1)
        : Promise.resolve([] as { firstName: string; lastName: string }[]),
    ])

    return NextResponse.json({
      task: {
        ...task,
        estimatedHours: task.estimatedHours ? Number(task.estimatedHours) : null,
        actualHours: task.actualHours ? Number(task.actualHours) : null,
        assigneeName: assigneeRows[0]
          ? `${assigneeRows[0].firstName} ${assigneeRows[0].lastName}`
          : null,
      },
    })
  }
)

// ── PATCH /api/renovation/projects/[id]/tasks/[taskId] ───────────────────────

const patchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  taskType: z.enum(["labor", "inspection", "delivery", "procurement", "approval"]).optional(),
  status: z.enum(["todo", "in_progress", "blocked", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  phaseId: z.string().uuid().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  estimatedHours: z.number().nonnegative().nullable().optional(),
  actualHours: z.number().nonnegative().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  blockedReason: z.string().nullable().optional(),
})

export const PATCH = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, taskId } = ids(req)
    const { companyId, userId, sessionId } = ctx.session

    const task = await resolveTask(projectId, taskId, companyId)
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 422 })

    const { estimatedHours, actualHours, ...rest } = parsed.data

    const completedAt =
      parsed.data.status === "done" && task.status !== "done" ? new Date() : undefined
    const completedBy =
      parsed.data.status === "done" && task.status !== "done" ? userId : undefined

    const [updated] = await db
      .update(renovationTasks)
      .set({
        ...rest,
        ...(estimatedHours !== undefined
          ? { estimatedHours: estimatedHours !== null ? String(estimatedHours) : null }
          : {}),
        ...(actualHours !== undefined
          ? { actualHours: actualHours !== null ? String(actualHours) : null }
          : {}),
        ...(completedAt ? { completedAt, completedBy } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(renovationTasks.id, taskId),
          eq(renovationTasks.projectId, projectId),
          isNull(renovationTasks.deletedAt)
        )
      )
      .returning({
        id: renovationTasks.id,
        title: renovationTasks.title,
        status: renovationTasks.status,
      })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "renovation.tasks.update",
      entityType: "renovation_task",
      entityId: taskId,
      payload: parsed.data,
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ── DELETE /api/renovation/projects/[id]/tasks/[taskId] ──────────────────────
// Soft-delete (sets deletedAt). Blocked if task is in_progress or blocked.

export const DELETE = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, taskId } = ids(req)
    const { companyId, userId, sessionId } = ctx.session

    const task = await resolveTask(projectId, taskId, companyId)
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (task.status === "in_progress")
      return NextResponse.json(
        { error: "Cannot delete: task is currently in progress" },
        { status: 409 }
      )

    await db
      .update(renovationTasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(renovationTasks.id, taskId), eq(renovationTasks.projectId, projectId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "renovation.tasks.delete",
      entityType: "renovation_task",
      entityId: taskId,
      payload: { title: task.title },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
