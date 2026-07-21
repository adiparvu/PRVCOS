import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { projectMilestones, projects } from "@prv/db/schema"
import { writeAuditLog } from "@prv/auth"
import { eq, and, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const taskId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!taskId) {
    return NextResponse.json({ error: "Missing task ID" }, { status: 400 })
  }

  const [row] = await db
    .select({
      id: projectMilestones.id,
      title: projectMilestones.title,
      description: projectMilestones.description,
      dueDate: projectMilestones.dueDate,
      isComplete: projectMilestones.isComplete,
      completedAt: projectMilestones.completedAt,
      createdAt: projectMilestones.createdAt,
      projectId: projects.id,
      projectName: projects.name,
      projectStatus: projects.status,
    })
    .from(projectMilestones)
    .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
    .where(
      and(
        eq(projectMilestones.id, taskId),
        eq(projects.companyId, ctx.companyId),
        isNull(projects.deletedAt)
      )
    )
    .limit(1)

  if (!row) {
    return NextResponse.json({ error: "Task not found", code: "NOT_FOUND" }, { status: 404 })
  }

  const isOverdue = !row.isComplete && row.dueDate ? new Date(row.dueDate) < new Date() : false

  return NextResponse.json({
    task: {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      dueDate: row.dueDate ?? null,
      isComplete: row.isComplete,
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      isOverdue,
    },
    project: {
      id: row.projectId,
      name: row.projectName,
      status: row.projectStatus,
    },
  })
})

const patchSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    isComplete: z.boolean().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })

export const PATCH = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const taskId = req.nextUrl.pathname.split("/").pop() ?? ""
  if (!taskId) {
    return NextResponse.json({ error: "Missing task ID" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { isComplete } = parsed.data

  const [existing] = await db
    .select({
      id: projectMilestones.id,
      isComplete: projectMilestones.isComplete,
      projectId: projectMilestones.projectId,
    })
    .from(projectMilestones)
    .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
    .where(
      and(
        eq(projectMilestones.id, taskId),
        eq(projects.companyId, ctx.companyId),
        isNull(projects.deletedAt)
      )
    )
    .limit(1)

  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 })
  }

  const { isComplete: _ic, ...milestoneFields } = parsed.data
  const [updated] = await db
    .update(projectMilestones)
    .set({
      ...milestoneFields,
      ...(isComplete !== undefined
        ? { isComplete, completedAt: isComplete ? new Date() : null }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(projectMilestones.id, taskId))
    .returning({ id: projectMilestones.id, isComplete: projectMilestones.isComplete })

  if (!updated) {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action:
      isComplete === undefined
        ? "mobile.task.update"
        : isComplete
          ? "mobile.task.complete"
          : "mobile.task.reopen",
    entityType: "project_milestone",
    entityId: taskId,
    method: "PATCH",
    path: `/api/mobile/tasks/${taskId}`,
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
    payload: { projectId: existing.projectId, ...parsed.data },
  })

  return NextResponse.json({ id: updated.id, isComplete: updated.isComplete })
})
