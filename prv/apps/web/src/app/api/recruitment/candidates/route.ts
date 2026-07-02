import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { candidates, jobRequisitions } from "@prv/db/schema"
import { and, eq, asc } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const STAGES = [
  "sourcing",
  "screening",
  "phone_screen",
  "interview",
  "assessment",
  "offer",
  "hired",
  "rejected",
] as const

export interface Candidate {
  id: string
  requisitionId: string
  fullName: string
  email: string | null
  source: string | null
  stage: (typeof STAGES)[number]
  rating: number | null
  orderIndex: number
}

async function verifyRequisition(reqId: string, companyId: string) {
  const [row] = await db
    .select({ id: jobRequisitions.id })
    .from(jobRequisitions)
    .where(and(eq(jobRequisitions.id, reqId), eq(jobRequisitions.companyId, companyId)))
    .limit(1)
  return row ?? null
}

// GET /api/recruitment/candidates?requisitionId= — the pipeline for one role.
export const GET = withGates(
  { action: "hr.recruitment.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const requisitionId = req.nextUrl.searchParams.get("requisitionId")
    if (!requisitionId) {
      return NextResponse.json({ error: "requisitionId is required" }, { status: 400 })
    }

    const rows = await db
      .select({
        id: candidates.id,
        requisitionId: candidates.requisitionId,
        fullName: candidates.fullName,
        email: candidates.email,
        source: candidates.source,
        stage: candidates.stage,
        rating: candidates.rating,
        orderIndex: candidates.orderIndex,
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.companyId, ctx.session.companyId),
          eq(candidates.requisitionId, requisitionId)
        )
      )
      .orderBy(asc(candidates.orderIndex), asc(candidates.createdAt))

    return NextResponse.json({ candidates: rows as Candidate[] })
  }
)

// POST /api/recruitment/candidates — add a candidate to a requisition.
const postSchema = z.object({
  requisitionId: z.string().uuid(),
  fullName: z.string().min(1).max(160),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  source: z.string().max(80).nullable().optional(),
  stage: z.enum(STAGES).default("sourcing"),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
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

    const requisition = await verifyRequisition(d.requisitionId, companyId)
    if (!requisition) {
      return NextResponse.json({ error: "Requisition not found" }, { status: 404 })
    }

    const [record] = await db
      .insert(candidates)
      .values({
        companyId,
        requisitionId: d.requisitionId,
        fullName: d.fullName,
        email: d.email ?? null,
        phone: d.phone ?? null,
        source: d.source ?? null,
        stage: d.stage,
        rating: d.rating ?? null,
        notes: d.notes ?? null,
        appliedAt: new Date().toISOString().slice(0, 10),
        createdById: actorId,
      })
      .returning({ id: candidates.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "hr.recruitment.candidate.create",
      entityType: "candidate",
      entityId: record?.id ?? d.fullName,
      payload: { requisitionId: d.requisitionId, fullName: d.fullName, stage: d.stage },
      method: "POST",
      path: "/api/recruitment/candidates",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
