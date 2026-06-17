import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { withMobileAuth } from "@/lib/mobile/auth"
import { db } from "@prv/db"
import { projectMilestones, projects } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withMobileAuth(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams
  const projectId = sp.get("projectId")
  const completed = sp.get("completed")

  const conditions = [
    eq(projects.companyId, ctx.companyId),
    isNull(projects.deletedAt),
  ]

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
