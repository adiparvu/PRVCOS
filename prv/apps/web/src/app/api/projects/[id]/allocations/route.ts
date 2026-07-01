import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { projects, projectAllocations, users } from "@prv/db/schema"
import { and, eq, isNull, or, gte } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ProjectAllocation {
  id: string
  userId: string
  name: string
  jobTitle: string | null
  avatarUrl: string | null
  allocationPercentage: number
  roleLabel: string | null
  startDate: string | null
  endDate: string | null
  notes: string | null
  // The user's TOTAL committed allocation across all active projects; lets the
  // UI flag over-allocation without a second round-trip.
  userTotalPercentage: number
  overAllocated: boolean
}

function pid(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2) ?? ""
}
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

async function verifyProject(id: string, companyId: string) {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.companyId, companyId), isNull(projects.deletedAt)))
    .limit(1)
  return row ?? null
}

// ─── GET /api/projects/[id]/allocations ──────────────────────────────────────
// Allocations for one project, each annotated with the assignee's company-wide
// utilization so the UI can flag over-allocation conflicts inline.
export const GET = withGates(
  { action: "projects.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const project = await verifyProject(id, ctx.session.companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const day = today()

    const [rows, companyRows] = await Promise.all([
      db
        .select({
          id: projectAllocations.id,
          userId: projectAllocations.userId,
          allocationPercentage: projectAllocations.allocationPercentage,
          roleLabel: projectAllocations.roleLabel,
          startDate: projectAllocations.startDate,
          endDate: projectAllocations.endDate,
          notes: projectAllocations.notes,
          firstName: users.firstName,
          lastName: users.lastName,
          jobTitle: users.jobTitle,
          avatarUrl: users.avatarUrl,
        })
        .from(projectAllocations)
        .innerJoin(users, eq(projectAllocations.userId, users.id))
        .where(eq(projectAllocations.projectId, id)),
      // All active allocations in the company, to sum utilization per user.
      db
        .select({
          userId: projectAllocations.userId,
          allocationPercentage: projectAllocations.allocationPercentage,
        })
        .from(projectAllocations)
        .where(
          and(
            eq(projectAllocations.companyId, ctx.session.companyId),
            or(isNull(projectAllocations.endDate), gte(projectAllocations.endDate, day))
          )
        ),
    ])

    const totals = new Map<string, number>()
    for (const r of companyRows) {
      totals.set(r.userId, (totals.get(r.userId) ?? 0) + r.allocationPercentage)
    }

    const allocations: ProjectAllocation[] = rows.map((r) => {
      const userTotalPercentage = totals.get(r.userId) ?? r.allocationPercentage
      return {
        id: r.id,
        userId: r.userId,
        name: `${r.firstName} ${r.lastName}`.trim(),
        jobTitle: r.jobTitle,
        avatarUrl: r.avatarUrl,
        allocationPercentage: r.allocationPercentage,
        roleLabel: r.roleLabel,
        startDate: r.startDate,
        endDate: r.endDate,
        notes: r.notes,
        userTotalPercentage,
        overAllocated: userTotalPercentage > 100,
      }
    })

    allocations.sort((a, b) => b.allocationPercentage - a.allocationPercentage)

    return NextResponse.json({ allocations })
  }
)

// ─── POST /api/projects/[id]/allocations ─────────────────────────────────────
const ISO = /^\d{4}-\d{2}-\d{2}$/
const postSchema = z.object({
  userId: z.string().uuid(),
  allocationPercentage: z.number().int().min(0).max(100),
  roleLabel: z.string().max(120).nullable().optional(),
  startDate: z.string().regex(ISO).nullable().optional(),
  endDate: z.string().regex(ISO).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const POST = withGates(
  { action: "projects.update", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = pid(req)
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

    const project = await verifyProject(id, companyId)
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = postSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const [record] = await db
      .insert(projectAllocations)
      .values({
        companyId,
        projectId: id,
        userId: d.userId,
        allocationPercentage: d.allocationPercentage,
        roleLabel: d.roleLabel ?? null,
        startDate: d.startDate ?? null,
        endDate: d.endDate ?? null,
        notes: d.notes ?? null,
        createdById: actorId,
      })
      .onConflictDoUpdate({
        target: [projectAllocations.projectId, projectAllocations.userId],
        set: {
          allocationPercentage: d.allocationPercentage,
          roleLabel: d.roleLabel ?? null,
          startDate: d.startDate ?? null,
          endDate: d.endDate ?? null,
          notes: d.notes ?? null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: projectAllocations.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "projects.allocation.upsert",
      entityType: "project",
      entityId: id,
      payload: { userId: d.userId, allocationPercentage: d.allocationPercentage },
      method: "POST",
      path: `/api/projects/${id}/allocations`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
