import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectTasks, users } from "@prv/db/schema"
import { and, eq, asc } from "drizzle-orm"
import { z } from "zod"
import { writeProjectActivity } from "@/lib/project-activity"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const STATUSES = ["backlog", "todo", "in_progress", "review", "done", "cancelled"] as const
const PRIORITIES = ["low", "medium", "high", "critical"] as const
type Status = (typeof STATUSES)[number]

export interface TaskSummary {
  id: string
  title: string
  description: string | null
  status: Status
  priority: (typeof PRIORITIES)[number]
  assigneeId: string | null
  assigneeName: string | null
  dueDate: string | null
  estimatedHours: number | null
  actualHours: number | null
  parentTaskId: string | null
  dependsOnTaskId: string | null
  orderIndex: number
  tags: string[]
  startedAt: string | null
  completedAt: string | null
}

function pid(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}
function toNum(v: string | null): number | null {
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

async function verifyProject(id: string, companyId: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, companyId)))
    .limit(1)
  return row ?? null
}

// GET /api/projects/[id]/tasks?status= — the project's task board (flat list,
// client groups by status for the Kanban). Ordered by column position.
export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const project = await verifyProject(id, ctx.session.companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const statusFilter = req.nextUrl.searchParams.get("status")
    const conds = [eq(projectTasks.projectId, id)]
    if (statusFilter && (STATUSES as readonly string[]).includes(statusFilter)) {
      conds.push(eq(projectTasks.status, statusFilter as Status))
    }

    const rows = await db
      .select({
        id: projectTasks.id,
        title: projectTasks.title,
        description: projectTasks.description,
        status: projectTasks.status,
        priority: projectTasks.priority,
        assigneeId: projectTasks.assigneeId,
        dueDate: projectTasks.dueDate,
        estimatedHours: projectTasks.estimatedHours,
        actualHours: projectTasks.actualHours,
        parentTaskId: projectTasks.parentTaskId,
        dependsOnTaskId: projectTasks.dependsOnTaskId,
        orderIndex: projectTasks.orderIndex,
        tags: projectTasks.tags,
        startedAt: projectTasks.startedAt,
        completedAt: projectTasks.completedAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(projectTasks)
      .leftJoin(users, eq(projectTasks.assigneeId, users.id))
      .where(and(...conds))
      .orderBy(asc(projectTasks.orderIndex), asc(projectTasks.createdAt))

    const tasks: TaskSummary[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status as Status,
      priority: r.priority as TaskSummary["priority"],
      assigneeId: r.assigneeId,
      assigneeName: r.firstName ? `${r.firstName} ${r.lastName}`.trim() : null,
      dueDate: r.dueDate,
      estimatedHours: toNum(r.estimatedHours),
      actualHours: toNum(r.actualHours),
      parentTaskId: r.parentTaskId,
      dependsOnTaskId: r.dependsOnTaskId,
      orderIndex: r.orderIndex,
      tags: r.tags ?? [],
      startedAt: r.startedAt ? r.startedAt.toISOString() : null,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    }))

    return NextResponse.json({ tasks })
  }
)

// POST /api/projects/[id]/tasks — create a task.
const postSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(STATUSES).default("backlog"),
  priority: z.enum(PRIORITIES).default("medium"),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  estimatedHours: z.number().min(0).max(100000).nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  dependsOnTaskId: z.string().uuid().nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
})

export const POST = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session
    const project = await verifyProject(id, companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = postSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const [record] = await db
      .insert(projectTasks)
      .values({
        companyId,
        projectId: id,
        title: d.title,
        description: d.description ?? null,
        status: d.status,
        priority: d.priority,
        assigneeId: d.assigneeId ?? null,
        assignedById: d.assigneeId ? actorId : null,
        dueDate: d.dueDate ?? null,
        estimatedHours: d.estimatedHours != null ? d.estimatedHours.toFixed(2) : null,
        parentTaskId: d.parentTaskId ?? null,
        dependsOnTaskId: d.dependsOnTaskId ?? null,
        orderIndex: d.orderIndex ?? 0,
      })
      .returning({ id: projectTasks.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "projects.task.create",
      entityType: "project",
      entityId: id,
      payload: { title: d.title, status: d.status },
      method: "POST",
      path: `/api/projects/${id}/tasks`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    void writeProjectActivity({
      companyId,
      projectId: id,
      actorId,
      kind: "task",
      summary: `created task \u201C${d.title}\u201D`,
      entityType: "task",
      entityId: record?.id ?? null,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
