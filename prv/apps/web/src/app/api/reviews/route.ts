import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { reviews, reviewCycles, users } from "@prv/db/schema"
import { and, eq, asc } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const STAGES = ["self_review", "manager_review", "hr_review", "signed_off"] as const

export interface ReviewSummary {
  id: string
  userId: string
  userName: string | null
  jobTitle: string | null
  stage: (typeof STAGES)[number]
  selfRating: number | null
  managerRating: number | null
  hrRating: number | null
  overallRating: number | null
  signedOff: boolean
}

async function verifyCycle(cycleId: string, companyId: string) {
  const [row] = await db
    .select({ id: reviewCycles.id })
    .from(reviewCycles)
    .where(and(eq(reviewCycles.id, cycleId), eq(reviewCycles.companyId, companyId)))
    .limit(1)
  return row ?? null
}

// GET /api/reviews?cycleId= — the reviews in a cycle.
export const GET = withGates(
  { action: "hr.reviews.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const cycleId = req.nextUrl.searchParams.get("cycleId")
    if (!cycleId) return NextResponse.json({ error: "cycleId is required" }, { status: 400 })

    const rows = await db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        stage: reviews.stage,
        selfRating: reviews.selfRating,
        managerRating: reviews.managerRating,
        hrRating: reviews.hrRating,
        overallRating: reviews.overallRating,
        signedOffAt: reviews.signedOffAt,
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(and(eq(reviews.companyId, ctx.session.companyId), eq(reviews.cycleId, cycleId)))
      .orderBy(asc(users.lastName))

    const list: ReviewSummary[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.firstName ? `${r.firstName} ${r.lastName}`.trim() : null,
      jobTitle: r.jobTitle,
      stage: r.stage as (typeof STAGES)[number],
      selfRating: r.selfRating,
      managerRating: r.managerRating,
      hrRating: r.hrRating,
      overallRating: r.overallRating,
      signedOff: !!r.signedOffAt,
    }))

    return NextResponse.json({ reviews: list })
  }
)

// POST /api/reviews — add an employee to a review cycle.
const postSchema = z.object({
  cycleId: z.string().uuid(),
  userId: z.string().uuid(),
  reviewerId: z.string().uuid().nullable().optional(),
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

    const cycle = await verifyCycle(d.cycleId, companyId)
    if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })

    const [record] = await db
      .insert(reviews)
      .values({
        companyId,
        cycleId: d.cycleId,
        userId: d.userId,
        reviewerId: d.reviewerId ?? null,
      })
      .onConflictDoNothing()
      .returning({ id: reviews.id })

    if (!record) {
      return NextResponse.json({ error: "Employee already in this cycle" }, { status: 409 })
    }

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "hr.reviews.create",
      entityType: "review",
      entityId: record.id,
      payload: { cycleId: d.cycleId, userId: d.userId },
      method: "POST",
      path: "/api/reviews",
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: record.id }, { status: 201 })
  }
)
