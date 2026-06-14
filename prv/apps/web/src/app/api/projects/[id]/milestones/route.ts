import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectMilestones } from "@prv/db/schema"
import { and, asc, eq, isNull, max } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function projectId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  // /api/projects/[id]/milestones → id is at index -2
  return parts.at(-2) ?? ""
}

async function verifyProjectOwnership(
  pid: string,
  companyId: string
): Promise<{ id: string } | null> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, pid), eq(projects.companyId, companyId), isNull(projects.deletedAt)))
    .limit(1)
  return row ?? null
}

// ─── GET /api/projects/[id]/milestones ───────────────────────────────────────

export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const pid = projectId(req)
    if (!pid) return NextResponse.json({ error: "Missing project id" }, { status: 400 })

    const owner = await verifyProjectOwnership(pid, ctx.session.companyId)
    if (!owner) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const rows = await db
      .select({
        id: projectMilestones.id,
        title: projectMilestones.title,
        description: projectMilestones.description,
        dueDate: projectMilestones.dueDate,
        completedAt: projectMilestones.completedAt,
        isComplete: projectMilestones.isComplete,
        sortOrder: projectMilestones.sortOrder,
        createdAt: projectMilestones.createdAt,
        updatedAt: projectMilestones.updatedAt,
      })
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, pid))
      .orderBy(asc(projectMilestones.sortOrder))

    const milestones = rows.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      dueDate: m.dueDate,
      completedAt: m.completedAt?.toISOString() ?? null,
      isComplete: m.isComplete,
      sortOrder: m.sortOrder,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }))

    const total = milestones.length
    const done = milestones.filter((m) => m.isComplete).length
    const completionPct = total > 0 ? Math.round((done / total) * 100) : 0

    return NextResponse.json({ milestones, total, done, completionPct })
  }
)

// ─── POST /api/projects/[id]/milestones ──────────────────────────────────────

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sortOrder: z.number().int().nonnegative().optional(),
})

export const POST = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const pid = projectId(req)
    if (!pid) return NextResponse.json({ error: "Missing project id" }, { status: 400 })

    const { companyId, userId, sessionId } = ctx.session

    const owner = await verifyProjectOwnership(pid, companyId)
    if (!owner) return NextResponse.json({ error: "Project not found" }, { status: 404 })

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

    // Auto-increment sortOrder if not provided
    let sortOrder = parsed.data.sortOrder
    if (sortOrder === undefined) {
      const [maxRow] = await db
        .select({ maxOrder: max(projectMilestones.sortOrder) })
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, pid))
      sortOrder = (maxRow?.maxOrder ?? -1) + 1
    }

    const [record] = await db
      .insert(projectMilestones)
      .values({
        projectId: pid,
        title: parsed.data.title,
        description: parsed.data.description,
        dueDate: parsed.data.dueDate,
        sortOrder,
      })
      .returning({
        id: projectMilestones.id,
        title: projectMilestones.title,
        sortOrder: projectMilestones.sortOrder,
      })

    if (!record) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "projects.milestone.create",
      entityType: "project",
      entityId: pid,
      payload: { milestoneId: record.id, ...parsed.data },
      method: "POST",
      path: `/api/projects/${pid}/milestones`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(record, { status: 201 })
  }
)
