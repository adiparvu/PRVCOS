import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { reviews } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { nextStage } from "@/lib/review-workflow"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function id(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

// PATCH /api/reviews/[id] — advance the workflow. Records the current stage's
// rating + comments, then moves to the next stage (HR review → signed off sets
// the overall rating + sign-off timestamp).
const patchSchema = z.object({
  action: z.literal("advance"),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  comments: z.string().max(5000).nullable().optional(),
  reviewerId: z.string().uuid().nullable().optional(),
})

export const PATCH = withGates(
  { action: "hr.reviews.write", endpointClass: "api_write" },
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
    const d = parsed.data

    const [current] = await db
      .select({ id: reviews.id, stage: reviews.stage })
      .from(reviews)
      .where(and(eq(reviews.id, rowId), eq(reviews.companyId, companyId)))
      .limit(1)
    if (!current) return NextResponse.json({ error: "Review not found" }, { status: 404 })

    const next = nextStage(current.stage)
    if (!next) {
      return NextResponse.json(
        { error: "Review is already signed off", code: "REVIEW_COMPLETE" },
        { status: 409 }
      )
    }

    const patch: Record<string, unknown> = { updatedAt: new Date(), stage: next }
    // Stamp the current stage's rating/comments.
    if (current.stage === "self_review") {
      if (d.rating !== undefined) patch.selfRating = d.rating
      if (d.comments !== undefined) patch.selfComments = d.comments
    } else if (current.stage === "manager_review") {
      if (d.rating !== undefined) patch.managerRating = d.rating
      if (d.comments !== undefined) patch.managerComments = d.comments
      if (d.reviewerId !== undefined) patch.reviewerId = d.reviewerId
    } else if (current.stage === "hr_review") {
      if (d.rating !== undefined) {
        patch.hrRating = d.rating
        patch.overallRating = d.rating
      }
      if (d.comments !== undefined) patch.hrComments = d.comments
      patch.signedOffAt = new Date()
    }

    const [updated] = await db
      .update(reviews)
      .set(patch)
      .where(and(eq(reviews.id, rowId), eq(reviews.companyId, companyId)))
      .returning({ id: reviews.id, stage: reviews.stage })

    void writeAuditLog({
      companyId,
      actorId,
      sessionId,
      action: "hr.reviews.advance",
      entityType: "review",
      entityId: rowId,
      payload: { from: current.stage, to: next },
      method: "PATCH",
      path: `/api/reviews/${rowId}`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: updated?.id, stage: updated?.stage })
  }
)
