import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { renovationPhases, renovationProjects } from "@prv/db/schema"
import { and, asc, eq, isNull } from "drizzle-orm"

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

    const phases = await db
      .select()
      .from(renovationPhases)
      .where(eq(renovationPhases.projectId, id))
      .orderBy(asc(renovationPhases.phaseNumber))

    return NextResponse.json({
      phases: phases.map((p) => ({
        ...p,
        estimatedCost: p.estimatedCost ? Number(p.estimatedCost) : null,
        actualCost: p.actualCost ? Number(p.actualCost) : null,
      })),
    })
  }
)

const createSchema = z.object({
  phaseNumber: z.number().int().positive(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "paused", "completed", "cancelled"]).optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  estimatedCost: z.number().nonnegative().optional(),
  requiresClientApproval: z.boolean().optional(),
  supervisorId: z.string().uuid().nullable().optional(),
  lexorank: z.string().optional(),
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

    const { estimatedCost, ...rest } = parsed.data
    const [phase] = await db
      .insert(renovationPhases)
      .values({
        projectId: id,
        ...rest,
        ...(estimatedCost !== undefined ? { estimatedCost: String(estimatedCost) } : {}),
      })
      .returning({ id: renovationPhases.id, title: renovationPhases.title })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "renovation.phases.create",
      entityType: "renovation_phase",
      entityId: phase!.id,
      payload: parsed.data,
      method: "POST",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(phase, { status: 201 })
  }
)
