import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectAllocations } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// /api/projects/[id]/allocations/[allocationId]
function ids(req: NextRequest): { projectId: string; allocationId: string } {
  const parts = req.nextUrl.pathname.split("/")
  return { projectId: parts.at(-3) ?? "", allocationId: parts.at(-1) ?? "" }
}

async function verifyProject(id: string, companyId: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, companyId), isNull(projects.deletedAt)))
    .limit(1)
  return row ?? null
}

const patchSchema = z
  .object({
    allocationPercentage: z.number().int().min(0).max(100).optional(),
    roleLabel: z.string().max(120).nullable().optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })

export const PATCH = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, allocationId } = ids(req)
    if (!projectId || !allocationId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    const { companyId, userId: actorId, sessionId } = ctx.session
    const project = await verifyProject(projectId, companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

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
    const d = parsed.data

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (d.allocationPercentage !== undefined) patch.allocationPercentage = d.allocationPercentage
    if (d.roleLabel !== undefined) patch.roleLabel = d.roleLabel
    if (d.startDate !== undefined) patch.startDate = d.startDate
    if (d.endDate !== undefined) patch.endDate = d.endDate
    if (d.notes !== undefined) patch.notes = d.notes

    const [updated] = await db
      .update(projectAllocations)
      .set(patch)
      .where(
        and(
          eq(projectAllocations.id, allocationId),
          eq(projectAllocations.projectId, projectId),
          eq(projectAllocations.companyId, companyId)
        )
      )
      .returning({ id: projectAllocations.id })

    if (!updated) return NextResponse.json({ error: "Allocation not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "projects.allocation.update",
      entityType: "project",
      entityId: projectId,
      payload: { allocationId, ...d },
      method: "PATCH",
      path: `/api/projects/${projectId}/allocations/${allocationId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated.id })
  }
)

export const DELETE = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, allocationId } = ids(req)
    if (!projectId || !allocationId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 })
    }

    const { companyId, userId: actorId, sessionId } = ctx.session
    const project = await verifyProject(projectId, companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const deleted = await db
      .delete(projectAllocations)
      .where(
        and(
          eq(projectAllocations.id, allocationId),
          eq(projectAllocations.projectId, projectId),
          eq(projectAllocations.companyId, companyId)
        )
      )
      .returning({ id: projectAllocations.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Allocation not found" }, { status: 404 })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "projects.allocation.remove",
      entityType: "project",
      entityId: projectId,
      payload: { allocationId },
      method: "DELETE",
      path: `/api/projects/${projectId}/allocations/${allocationId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ removed: deleted.length })
  }
)
