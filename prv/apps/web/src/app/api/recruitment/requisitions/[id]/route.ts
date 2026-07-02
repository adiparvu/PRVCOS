import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { jobRequisitions, candidates, departments, users } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { computeFunnel, type Funnel } from "@/lib/recruitment"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const STATUSES = ["open", "on_hold", "filled", "closed"] as const

function id(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

// GET /api/recruitment/requisitions/[id] — a requisition with its pipeline funnel.
export const GET = withGates(
  { action: "hr.recruitment.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const [row] = await db
      .select({
        id: jobRequisitions.id,
        title: jobRequisitions.title,
        employmentType: jobRequisitions.employmentType,
        headcount: jobRequisitions.headcount,
        status: jobRequisitions.status,
        location: jobRequisitions.location,
        description: jobRequisitions.description,
        departmentName: departments.name,
        managerFirst: users.firstName,
        managerLast: users.lastName,
      })
      .from(jobRequisitions)
      .leftJoin(departments, eq(jobRequisitions.departmentId, departments.id))
      .leftJoin(users, eq(jobRequisitions.hiringManagerId, users.id))
      .where(
        and(eq(jobRequisitions.id, rowId), eq(jobRequisitions.companyId, ctx.session.companyId))
      )
      .limit(1)

    if (!row) return NextResponse.json({ error: "Requisition not found" }, { status: 404 })

    const candRows = await db
      .select({ stage: candidates.stage })
      .from(candidates)
      .where(eq(candidates.requisitionId, rowId))

    const funnel: Funnel = computeFunnel(candRows.map((c) => c.stage))

    return NextResponse.json({
      requisition: {
        id: row.id,
        title: row.title,
        employmentType: row.employmentType,
        headcount: row.headcount,
        status: row.status,
        location: row.location,
        description: row.description,
        departmentName: row.departmentName,
        hiringManagerName: row.managerFirst
          ? `${row.managerFirst} ${row.managerLast}`.trim()
          : null,
      },
      funnel,
    })
  }
)

const patchSchema = z
  .object({
    title: z.string().min(1).max(160).optional(),
    status: z.enum(STATUSES).optional(),
    headcount: z.number().int().min(1).max(1000).optional(),
    location: z.string().max(160).nullable().optional(),
    description: z.string().max(20000).nullable().optional(),
    hiringManagerId: z.string().uuid().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })

export const PATCH = withGates(
  { action: "hr.recruitment.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rowId = id(req)
    if (!rowId) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId: actorId, sessionId } = ctx.session

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

    const patch: Record<string, unknown> = { updatedAt: new Date(), ...parsed.data }

    const [updated] = await db
      .update(jobRequisitions)
      .set(patch)
      .where(and(eq(jobRequisitions.id, rowId), eq(jobRequisitions.companyId, companyId)))
      .returning({ id: jobRequisitions.id, status: jobRequisitions.status })

    if (!updated) return NextResponse.json({ error: "Requisition not found" }, { status: 404 })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "hr.recruitment.requisition.update",
      entityType: "job_requisition",
      entityId: rowId,
      payload: { ...parsed.data },
      method: "PATCH",
      path: `/api/recruitment/requisitions/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated.id, status: updated.status })
  }
)
