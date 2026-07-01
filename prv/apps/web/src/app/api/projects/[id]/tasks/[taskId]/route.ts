import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectTasks } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { writeProjectActivity } from "@/lib/project-activity"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const STATUSES = ["backlog", "todo", "in_progress", "review", "done", "cancelled"] as const
const PRIORITIES = ["low", "medium", "high", "critical"] as const
type Status = (typeof STATUSES)[number]

// Statuses that mean "work is underway" — moving into these requires any
// blocking dependency to already be done.
const ACTIVE_STATUSES = new Set<Status>(["in_progress", "review", "done"])

function ids(req: NextRequest): { projectId: string; taskId: string } {
  const parts = req.nextUrl.pathname.split("/")
  return { projectId: parts.at(-3) ?? "", taskId: parts.at(-1) ?? "" }
}

async function verifyProject(id: string, companyId: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, companyId)))
    .limit(1)
  return row ?? null
}

const patchSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).nullable().optional(),
    status: z.enum(STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    estimatedHours: z.number().min(0).max(100000).nullable().optional(),
    actualHours: z.number().min(0).max(100000).nullable().optional(),
    dependsOnTaskId: z.string().uuid().nullable().optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })

export const PATCH = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, taskId } = ids(req)
    if (!projectId || !taskId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session
    const project = await verifyProject(projectId, companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

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

    // Load the current task (scoped) — needed for lifecycle timestamps and the
    // dependency guard.
    const [current] = await db
      .select({
        id: projectTasks.id,
        status: projectTasks.status,
        startedAt: projectTasks.startedAt,
        dependsOnTaskId: projectTasks.dependsOnTaskId,
      })
      .from(projectTasks)
      .where(
        and(
          eq(projectTasks.id, taskId),
          eq(projectTasks.projectId, projectId),
          eq(projectTasks.companyId, companyId)
        )
      )
      .limit(1)
    if (!current) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    // Dependency guard: cannot move into an active status while the blocking
    // task is unfinished.
    const nextStatus = (d.status ?? current.status) as Status
    const dependsOn = d.dependsOnTaskId !== undefined ? d.dependsOnTaskId : current.dependsOnTaskId
    if (d.status && ACTIVE_STATUSES.has(nextStatus) && dependsOn) {
      const [blocker] = await db
        .select({ status: projectTasks.status })
        .from(projectTasks)
        .where(and(eq(projectTasks.id, dependsOn), eq(projectTasks.companyId, companyId)))
        .limit(1)
      if (blocker && blocker.status !== "done" && blocker.status !== "cancelled") {
        return NextResponse.json(
          { error: "Blocked by an unfinished dependency", code: "TASK_BLOCKED" },
          { status: 409 }
        )
      }
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (d.title !== undefined) patch.title = d.title
    if (d.description !== undefined) patch.description = d.description
    if (d.priority !== undefined) patch.priority = d.priority
    if (d.assigneeId !== undefined) {
      patch.assigneeId = d.assigneeId
      patch.assignedById = d.assigneeId ? actorId : null
    }
    if (d.dueDate !== undefined) patch.dueDate = d.dueDate
    if (d.estimatedHours !== undefined)
      patch.estimatedHours = d.estimatedHours != null ? d.estimatedHours.toFixed(2) : null
    if (d.actualHours !== undefined)
      patch.actualHours = d.actualHours != null ? d.actualHours.toFixed(2) : null
    if (d.dependsOnTaskId !== undefined) patch.dependsOnTaskId = d.dependsOnTaskId
    if (d.orderIndex !== undefined) patch.orderIndex = d.orderIndex

    if (d.status !== undefined) {
      patch.status = d.status
      // Lifecycle timestamps.
      if (d.status === "in_progress" && !current.startedAt) patch.startedAt = new Date()
      if (d.status === "done") patch.completedAt = new Date()
      if (d.status === "backlog" || d.status === "todo") patch.completedAt = null
    }

    const [updated] = await db
      .update(projectTasks)
      .set(patch)
      .where(
        and(
          eq(projectTasks.id, taskId),
          eq(projectTasks.projectId, projectId),
          eq(projectTasks.companyId, companyId)
        )
      )
      .returning({ id: projectTasks.id, status: projectTasks.status })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "projects.task.update",
      entityType: "project",
      entityId: projectId,
      payload: { taskId, ...d },
      method: "PATCH",
      path: `/api/projects/${projectId}/tasks/${taskId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    if (d.status !== undefined) {
      void writeProjectActivity({
        companyId,
        projectId,
        actorId,
        kind: "status",
        summary: `moved a task to ${d.status.replace("_", " ")}`,
        entityType: "task",
        entityId: taskId,
      })
    }

    return NextResponse.json({ id: updated?.id, status: updated?.status })
  }
)

export const DELETE = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, taskId } = ids(req)
    if (!projectId || !taskId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session
    const project = await verifyProject(projectId, companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const deleted = await db
      .delete(projectTasks)
      .where(
        and(
          eq(projectTasks.id, taskId),
          eq(projectTasks.projectId, projectId),
          eq(projectTasks.companyId, companyId)
        )
      )
      .returning({ id: projectTasks.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "projects.task.delete",
      entityType: "project",
      entityId: projectId,
      payload: { taskId },
      method: "DELETE",
      path: `/api/projects/${projectId}/tasks/${taskId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ removed: deleted.length })
  }
)
