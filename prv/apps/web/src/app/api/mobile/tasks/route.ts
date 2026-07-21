import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { projectMilestones, projects } from "@prv/db/schema"
import { and, asc, eq, isNull, max } from "drizzle-orm"
import { z } from "zod"
import { writeAuditLog } from "@prv/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams
  const projectId = sp.get("projectId")
  const completed = sp.get("completed")

  const conditions = [eq(projects.companyId, ctx.companyId), isNull(projects.deletedAt)]

  if (projectId) {
    conditions.push(eq(projectMilestones.projectId, projectId))
  }

  if (completed === "true") {
    conditions.push(eq(projectMilestones.isComplete, true))
  } else if (completed === "false") {
    conditions.push(eq(projectMilestones.isComplete, false))
  }

  const rows = await db
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
    .where(and(...conditions))
    .orderBy(asc(projectMilestones.dueDate), asc(projectMilestones.createdAt))
    .limit(100)

  const now = new Date()

  const tasks = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    dueDate: row.dueDate ?? null,
    isComplete: row.isComplete,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    isOverdue: !row.isComplete && row.dueDate ? new Date(row.dueDate) < now : false,
    project: {
      id: row.projectId,
      name: row.projectName,
      status: row.projectStatus,
    },
  }))

  return NextResponse.json({ tasks, count: tasks.length })
})

// ─── POST /api/mobile/tasks — create a project milestone ─────────────────────

const createSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sortOrder: z.number().int().nonnegative().optional(),
})

export const POST = withMobileAuth(async (req: NextRequest, ctx) => {
  const ipAddress =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // The project must belong to the caller's company and not be deleted.
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, parsed.data.projectId),
        eq(projects.companyId, ctx.companyId),
        isNull(projects.deletedAt)
      )
    )
    .limit(1)
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  let sortOrder = parsed.data.sortOrder
  if (sortOrder === undefined) {
    const [maxRow] = await db
      .select({ maxOrder: max(projectMilestones.sortOrder) })
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, parsed.data.projectId))
    sortOrder = (maxRow?.maxOrder ?? -1) + 1
  }

  const [record] = await db
    .insert(projectMilestones)
    .values({
      projectId: parsed.data.projectId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      dueDate: parsed.data.dueDate,
      sortOrder,
    })
    .returning({ id: projectMilestones.id, title: projectMilestones.title })

  if (!record) return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 })

  void writeAuditLog({
    companyId: ctx.companyId,
    actorId: ctx.userId,
    sessionId: ctx.sessionId,
    action: "mobile.task.create",
    entityType: "project_milestone",
    entityId: record.id,
    method: "POST",
    path: "/api/mobile/tasks",
    ipAddress,
    userAgent: req.headers.get("user-agent") ?? "",
    payload: { projectId: parsed.data.projectId },
  })

  return NextResponse.json({ id: record.id, title: record.title }, { status: 201 })
})
