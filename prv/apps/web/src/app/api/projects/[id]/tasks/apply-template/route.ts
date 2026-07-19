import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectTasks, taskTemplates } from "@prv/db/schema"
import { and, eq, sql } from "drizzle-orm"
import { z } from "zod"
import { buildTasksFromTemplate, normalizeTemplateItems } from "@/lib/task-template"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({ templateId: z.string().uuid() })

// POST /api/projects/[id]/tasks/apply-template — expand a saved template into
// backlog tasks on this project, appended after the current backlog order.
export const POST = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session
    const parts = req.nextUrl.pathname.split("/")
    const projectId = parts[parts.indexOf("projects") + 1] ?? ""

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success)
      return NextResponse.json({ error: "templateId is required" }, { status: 422 })

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)))
      .limit(1)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const [template] = await db
      .select()
      .from(taskTemplates)
      .where(
        and(eq(taskTemplates.id, parsed.data.templateId), eq(taskTemplates.companyId, companyId))
      )
      .limit(1)
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 })

    const items = normalizeTemplateItems(template.items)
    if (items.length === 0)
      return NextResponse.json({ error: "Template has no items" }, { status: 422 })

    // Continue orderIndex after the current max in the backlog column.
    const [maxRow] = await db
      .select({ max: sql<number>`COALESCE(MAX(${projectTasks.orderIndex}), 0)::int` })
      .from(projectTasks)
      .where(
        and(
          eq(projectTasks.projectId, projectId),
          eq(projectTasks.companyId, companyId),
          eq(projectTasks.status, "backlog")
        )
      )

    const rows = buildTasksFromTemplate(items, {
      companyId,
      projectId,
      startOrderIndex: maxRow?.max ?? 0,
    })

    const inserted = await db
      .insert(projectTasks)
      .values(rows.map((r) => ({ ...r, assignedById: userId })))
      .returning({ id: projectTasks.id })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "projects.task_template.apply",
      entityType: "project",
      entityId: projectId,
      payload: { templateId: template.id, templateName: template.name, created: inserted.length },
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ created: inserted.length }, { status: 201 })
  }
)
