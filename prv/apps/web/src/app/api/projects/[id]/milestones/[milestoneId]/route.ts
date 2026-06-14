import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectMilestones } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function extractIds(req: NextRequest): { pid: string; milestoneId: string } {
  const parts = req.nextUrl.pathname.split("/")
  // /api/projects/[id]/milestones/[milestoneId]
  return { pid: parts.at(-3) ?? "", milestoneId: parts.at(-1) ?? "" }
}

async function verifyAccess(
  pid: string,
  milestoneId: string,
  companyId: string
): Promise<{ milestone: { id: string; title: string } } | null> {
  const [projectRow] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, pid), eq(projects.companyId, companyId), isNull(projects.deletedAt)))
    .limit(1)

  if (!projectRow) return null

  const [milestoneRow] = await db
    .select({ id: projectMilestones.id, title: projectMilestones.title })
    .from(projectMilestones)
    .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, pid)))
    .limit(1)

  if (!milestoneRow) return null
  return { milestone: milestoneRow }
}

// ─── PATCH /api/projects/[id]/milestones/[milestoneId] ───────────────────────

const patchSchema = z.object({
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

export const PATCH = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { pid, milestoneId } = extractIds(req)
    if (!pid || !milestoneId) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

    const { companyId, userId, sessionId } = ctx.session

    const access = await verifyAccess(pid, milestoneId, companyId)
    if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 })

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

    const { isComplete, ...rest } = parsed.data
    const completedAt = isComplete === true ? new Date() : isComplete === false ? null : undefined

    const [updated] = await db
      .update(projectMilestones)
      .set({
        ...rest,
        ...(isComplete !== undefined ? { isComplete } : {}),
        ...(completedAt !== undefined ? { completedAt } : {}),
        updatedAt: new Date(),
      })
      .where(eq(projectMilestones.id, milestoneId))
      .returning({
        id: projectMilestones.id,
        title: projectMilestones.title,
        isComplete: projectMilestones.isComplete,
        completedAt: projectMilestones.completedAt,
        sortOrder: projectMilestones.sortOrder,
      })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "projects.milestone.update",
      entityType: "project",
      entityId: pid,
      payload: { milestoneId, ...parsed.data },
      method: "PATCH",
      path: `/api/projects/${pid}/milestones/${milestoneId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ─── DELETE /api/projects/[id]/milestones/[milestoneId] ──────────────────────

export const DELETE = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { pid, milestoneId } = extractIds(req)
    if (!pid || !milestoneId) return NextResponse.json({ error: "Missing ids" }, { status: 400 })

    const { companyId, userId, sessionId } = ctx.session

    const access = await verifyAccess(pid, milestoneId, companyId)
    if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db.delete(projectMilestones).where(eq(projectMilestones.id, milestoneId))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "projects.milestone.delete",
      entityType: "project",
      entityId: pid,
      payload: { milestoneId, title: access.milestone.title },
      method: "DELETE",
      path: `/api/projects/${pid}/milestones/${milestoneId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
