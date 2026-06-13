import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { renovationTasks, renovationProjects, users } from "@prv/db/schema"
import { and, asc, desc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function projectId(req: NextRequest) {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}

export const GET = withGates(
  { action: "renovation.projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = projectId(req)
    const { companyId } = ctx.session
    const { searchParams } = req.nextUrl
    const status = searchParams.get("status")
    const phaseId = searchParams.get("phaseId")

    const [project] = await db
      .select({ id: renovationProjects.id })
      .from(renovationProjects)
      .where(
        and(
          eq(renovationProjects.id, id),
          eq(renovationProjects.companyId, companyId),
          isNull(renovationProjects.deletedAt)
        )
      )
      .limit(1)
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const conditions = [eq(renovationTasks.projectId, id), isNull(renovationTasks.deletedAt)]
    if (status)
      conditions.push(eq(renovationTasks.status, status as typeof renovationTasks.status._.data))
    if (phaseId) conditions.push(eq(renovationTasks.phaseId, phaseId))

    const tasks = await db
      .select({
        id: renovationTasks.id,
        title: renovationTasks.title,
        description: renovationTasks.description,
        taskType: renovationTasks.taskType,
        status: renovationTasks.status,
        priority: renovationTasks.priority,
        phaseId: renovationTasks.phaseId,
        assignedTo: renovationTasks.assignedTo,
        assigneeName: users.firstName,
        assigneeLastName: users.lastName,
        estimatedHours: renovationTasks.estimatedHours,
        actualHours: renovationTasks.actualHours,
        dueDate: renovationTasks.dueDate,
        completedAt: renovationTasks.completedAt,
        blockedReason: renovationTasks.blockedReason,
        createdAt: renovationTasks.createdAt,
      })
      .from(renovationTasks)
      .leftJoin(users, eq(renovationTasks.assignedTo, users.id))
      .where(and(...conditions))
      .orderBy(asc(renovationTasks.dueDate), desc(renovationTasks.createdAt))

    return NextResponse.json({
      tasks: tasks.map((t) => ({
        ...t,
        estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
        actualHours: t.actualHours ? Number(t.actualHours) : null,
        assigneeName:
          t.assigneeName && t.assigneeLastName ? `${t.assigneeName} ${t.assigneeLastName}` : null,
      })),
    })
  }
)

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  taskType: z.enum(["labor", "inspection", "delivery", "procurement", "approval"]).optional(),
  status: z.enum(["todo", "in_progress", "blocked", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  phaseId: z.string().uuid().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  estimatedHours: z.number().nonnegative().optional(),
  dueDate: z.string().optional(),
  blockedReason: z.string().optional(),
})

export const POST = withGates(
  { action: "renovation.projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = projectId(req)
    const { companyId, userId } = ctx.session

    const [project] = await db
      .select({ id: renovationProjects.id })
      .from(renovationProjects)
      .where(
        and(
          eq(renovationProjects.id, id),
          eq(renovationProjects.companyId, companyId),
          isNull(renovationProjects.deletedAt)
        )
      )
      .limit(1)
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )
    }

    const { estimatedHours, ...rest } = parsed.data
    const [task] = await db
      .insert(renovationTasks)
      .values({
        projectId: id,
        ...rest,
        ...(estimatedHours !== undefined ? { estimatedHours: String(estimatedHours) } : {}),
      })
      .returning({ id: renovationTasks.id, title: renovationTasks.title })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "renovation.tasks.create",
      entityType: "renovation_task",
      entityId: task!.id,
      payload: parsed.data,
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(task, { status: 201 })
  }
)
