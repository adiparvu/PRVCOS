import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { jobRequisitions, candidates, departments, users } from "@prv/db/schema"
import { and, eq, desc } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const TYPES = ["permanent", "fixed_term", "contractor", "intern"] as const
const STATUSES = ["open", "on_hold", "filled", "closed"] as const

export interface RequisitionSummary {
  id: string
  title: string
  departmentName: string | null
  employmentType: (typeof TYPES)[number]
  headcount: number
  status: (typeof STATUSES)[number]
  hiringManagerName: string | null
  location: string | null
  candidateCount: number
  activeCount: number
  hiredCount: number
}

export interface RequisitionMeta {
  total: number
  open: number
  openHeadcount: number
  candidatesInPipeline: number
}

// GET /api/recruitment/requisitions — open roles with live candidate counts.
export const GET = withGates(
  { action: "hr.recruitment.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const cid = ctx.session.companyId

    const [reqRows, candRows] = await Promise.all([
      db
        .select({
          id: jobRequisitions.id,
          title: jobRequisitions.title,
          employmentType: jobRequisitions.employmentType,
          headcount: jobRequisitions.headcount,
          status: jobRequisitions.status,
          location: jobRequisitions.location,
          departmentName: departments.name,
          managerFirst: users.firstName,
          managerLast: users.lastName,
        })
        .from(jobRequisitions)
        .leftJoin(departments, eq(jobRequisitions.departmentId, departments.id))
        .leftJoin(users, eq(jobRequisitions.hiringManagerId, users.id))
        .where(eq(jobRequisitions.companyId, cid))
        .orderBy(desc(jobRequisitions.createdAt)),
      db
        .select({ requisitionId: candidates.requisitionId, stage: candidates.stage })
        .from(candidates)
        .where(eq(candidates.companyId, cid)),
    ])

    const counts = new Map<string, { total: number; active: number; hired: number }>()
    for (const c of candRows) {
      const e = counts.get(c.requisitionId) ?? { total: 0, active: 0, hired: 0 }
      e.total += 1
      if (c.stage === "hired") e.hired += 1
      else if (c.stage !== "rejected") e.active += 1
      counts.set(c.requisitionId, e)
    }

    const requisitions: RequisitionSummary[] = reqRows.map((r) => {
      const c = counts.get(r.id) ?? { total: 0, active: 0, hired: 0 }
      return {
        id: r.id,
        title: r.title,
        departmentName: r.departmentName,
        employmentType: r.employmentType as (typeof TYPES)[number],
        headcount: r.headcount,
        status: r.status as (typeof STATUSES)[number],
        hiringManagerName: r.managerFirst ? `${r.managerFirst} ${r.managerLast}`.trim() : null,
        location: r.location,
        candidateCount: c.total,
        activeCount: c.active,
        hiredCount: c.hired,
      }
    })

    const openReqs = requisitions.filter((r) => r.status === "open")
    const meta: RequisitionMeta = {
      total: requisitions.length,
      open: openReqs.length,
      openHeadcount: openReqs.reduce((s, r) => s + r.headcount, 0),
      candidatesInPipeline: requisitions.reduce((s, r) => s + r.activeCount, 0),
    }

    return NextResponse.json({ requisitions, meta })
  }
)

// POST /api/recruitment/requisitions — open a role.
const ISO = /^\d{4}-\d{2}-\d{2}$/
const postSchema = z.object({
  title: z.string().min(1).max(160),
  departmentId: z.string().uuid().nullable().optional(),
  employmentType: z.enum(TYPES).default("permanent"),
  headcount: z.number().int().min(1).max(1000).default(1),
  hiringManagerId: z.string().uuid().nullable().optional(),
  location: z.string().max(160).nullable().optional(),
  description: z.string().max(20000).nullable().optional(),
  openedAt: z.string().regex(ISO).nullable().optional(),
})

export const POST = withGates(
  { action: "hr.recruitment.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId: actorId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = postSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const d = parsed.data

    const [record] = await db
      .insert(jobRequisitions)
      .values({
        companyId,
        title: d.title,
        departmentId: d.departmentId ?? null,
        employmentType: d.employmentType,
        headcount: d.headcount,
        hiringManagerId: d.hiringManagerId ?? null,
        location: d.location ?? null,
        description: d.description ?? null,
        openedAt: d.openedAt ?? new Date().toISOString().slice(0, 10),
        createdById: actorId,
      })
      .returning({ id: jobRequisitions.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "hr.recruitment.requisition.create",
      entityType: "job_requisition",
      entityId: record?.id ?? d.title,
      payload: { title: d.title, headcount: d.headcount },
      method: "POST",
      path: "/api/recruitment/requisitions",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
