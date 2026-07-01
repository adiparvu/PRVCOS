import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectRisks } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const CATEGORIES = [
  "schedule",
  "cost",
  "quality",
  "safety",
  "resource",
  "external",
  "other",
] as const
const STATUSES = ["open", "mitigating", "monitoring", "closed", "accepted"] as const

function ids(req: NextRequest): { projectId: string; riskId: string } {
  const parts = req.nextUrl.pathname.split("/")
  return { projectId: parts.at(-3) ?? "", riskId: parts.at(-1) ?? "" }
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
    category: z.enum(CATEGORIES).optional(),
    impact: z.number().int().min(1).max(5).optional(),
    probability: z.number().int().min(1).max(5).optional(),
    mitigation: z.string().max(5000).nullable().optional(),
    status: z.enum(STATUSES).optional(),
    ownerId: z.string().uuid().nullable().optional(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })

export const PATCH = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, riskId } = ids(req)
    if (!projectId || !riskId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

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

    const patch: Record<string, unknown> = { updatedAt: new Date() }
    for (const k of [
      "title",
      "description",
      "category",
      "impact",
      "probability",
      "mitigation",
      "status",
      "ownerId",
      "dueDate",
    ] as const) {
      if (d[k] !== undefined) patch[k] = d[k]
    }

    const [updated] = await db
      .update(projectRisks)
      .set(patch)
      .where(
        and(
          eq(projectRisks.id, riskId),
          eq(projectRisks.projectId, projectId),
          eq(projectRisks.companyId, companyId)
        )
      )
      .returning({ id: projectRisks.id })

    if (!updated) return NextResponse.json({ error: "Risk not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "projects.risk.update",
      entityType: "project",
      entityId: projectId,
      payload: { riskId, ...d },
      method: "PATCH",
      path: `/api/projects/${projectId}/risks/${riskId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated.id })
  }
)

export const DELETE = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { projectId, riskId } = ids(req)
    if (!projectId || !riskId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session
    const project = await verifyProject(projectId, companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const deleted = await db
      .delete(projectRisks)
      .where(
        and(
          eq(projectRisks.id, riskId),
          eq(projectRisks.projectId, projectId),
          eq(projectRisks.companyId, companyId)
        )
      )
      .returning({ id: projectRisks.id })

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Risk not found" }, { status: 404 })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "projects.risk.delete",
      entityType: "project",
      entityId: projectId,
      payload: { riskId },
      method: "DELETE",
      path: `/api/projects/${projectId}/risks/${riskId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ removed: deleted.length })
  }
)
