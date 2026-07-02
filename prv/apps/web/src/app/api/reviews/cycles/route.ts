import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { reviewCycles, reviews } from "@prv/db/schema"
import { eq, desc } from "drizzle-orm"
import { z } from "zod"
import { cycleProgress, type CycleProgress } from "@/lib/review-workflow"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const CADENCE = ["annual", "semi_annual", "quarterly"] as const
const CYCLE_STATUS = ["draft", "active", "closed"] as const

export interface ReviewCycleSummary {
  id: string
  name: string
  cadence: (typeof CADENCE)[number]
  status: (typeof CYCLE_STATUS)[number]
  periodStart: string | null
  periodEnd: string | null
  dueDate: string | null
  progress: CycleProgress
}

// GET /api/reviews/cycles — review cycles with per-cycle workflow progress.
export const GET = withGates(
  { action: "hr.reviews.read", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const cid = ctx.session.companyId
    const [cycleRows, reviewRows] = await Promise.all([
      db
        .select({
          id: reviewCycles.id,
          name: reviewCycles.name,
          cadence: reviewCycles.cadence,
          status: reviewCycles.status,
          periodStart: reviewCycles.periodStart,
          periodEnd: reviewCycles.periodEnd,
          dueDate: reviewCycles.dueDate,
        })
        .from(reviewCycles)
        .where(eq(reviewCycles.companyId, cid))
        .orderBy(desc(reviewCycles.createdAt)),
      db
        .select({ cycleId: reviews.cycleId, stage: reviews.stage })
        .from(reviews)
        .where(eq(reviews.companyId, cid)),
    ])

    const stagesByCycle = new Map<string, string[]>()
    for (const r of reviewRows) {
      const arr = stagesByCycle.get(r.cycleId) ?? []
      arr.push(r.stage)
      stagesByCycle.set(r.cycleId, arr)
    }

    const cycles: ReviewCycleSummary[] = cycleRows.map((c) => ({
      id: c.id,
      name: c.name,
      cadence: c.cadence as (typeof CADENCE)[number],
      status: c.status as (typeof CYCLE_STATUS)[number],
      periodStart: c.periodStart,
      periodEnd: c.periodEnd,
      dueDate: c.dueDate,
      progress: cycleProgress(stagesByCycle.get(c.id) ?? []),
    }))

    return NextResponse.json({ cycles })
  }
)

// POST /api/reviews/cycles — open a review cycle.
const ISO = /^\d{4}-\d{2}-\d{2}$/
const postSchema = z.object({
  name: z.string().min(1).max(160),
  cadence: z.enum(CADENCE).default("annual"),
  status: z.enum(["draft", "active"]).default("active"),
  periodStart: z.string().regex(ISO).nullable().optional(),
  periodEnd: z.string().regex(ISO).nullable().optional(),
  dueDate: z.string().regex(ISO).nullable().optional(),
})

export const POST = withGates(
  { action: "hr.reviews.write", endpointClass: "api_write" },
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
      .insert(reviewCycles)
      .values({
        companyId,
        name: d.name,
        cadence: d.cadence,
        status: d.status,
        periodStart: d.periodStart ?? null,
        periodEnd: d.periodEnd ?? null,
        dueDate: d.dueDate ?? null,
        createdById: actorId,
      })
      .returning({ id: reviewCycles.id })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "hr.reviews.cycle.create",
      entityType: "review_cycle",
      entityId: record?.id ?? d.name,
      payload: { name: d.name, cadence: d.cadence },
      method: "POST",
      path: "/api/reviews/cycles",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record?.id }, { status: 201 })
  }
)
