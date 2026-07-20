import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { reviewPeerFeedback, reviews, reviewCycles, users } from "@prv/db/schema"
import { and, eq, desc } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface AssignedPeerFeedbackDto {
  id: string
  reviewId: string
  subjectName: string | null
  cycleName: string | null
  status: "pending" | "submitted" | "declined"
  rating: number | null
  requestedAt: string
}

// GET — peer-feedback requests assigned to the current user. Self-service: no
// role gate, and the query is hard-scoped to the caller's own peerId, so a user
// only ever sees requests addressed to them.
export const GET = withGates(
  { action: "hr.reviews.peer_assigned", endpointClass: "api_read" },
  async (_req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId, userId } = ctx.session

    const rows = await db
      .select({
        id: reviewPeerFeedback.id,
        reviewId: reviewPeerFeedback.reviewId,
        status: reviewPeerFeedback.status,
        rating: reviewPeerFeedback.rating,
        requestedAt: reviewPeerFeedback.requestedAt,
        firstName: users.firstName,
        lastName: users.lastName,
        cycleName: reviewCycles.name,
      })
      .from(reviewPeerFeedback)
      .innerJoin(reviews, eq(reviewPeerFeedback.reviewId, reviews.id))
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(reviewCycles, eq(reviews.cycleId, reviewCycles.id))
      .where(
        and(eq(reviewPeerFeedback.companyId, companyId), eq(reviewPeerFeedback.peerId, userId))
      )
      .orderBy(desc(reviewPeerFeedback.requestedAt))
      .limit(200)

    const assigned: AssignedPeerFeedbackDto[] = rows.map((r) => ({
      id: r.id,
      reviewId: r.reviewId,
      subjectName:
        r.firstName || r.lastName ? `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() : null,
      cycleName: r.cycleName ?? null,
      status: r.status,
      rating: r.rating,
      requestedAt: r.requestedAt.toISOString(),
    }))

    return NextResponse.json({ assigned })
  }
)
