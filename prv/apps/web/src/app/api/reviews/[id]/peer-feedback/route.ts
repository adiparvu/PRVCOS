import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { reviews, reviewPeerFeedback, companyMemberships, users } from "@prv/db/schema"
import { and, eq, desc } from "drizzle-orm"
import { z } from "zod"
import { summarizePeerFeedback, type PeerFeedbackItem } from "@/lib/peer-feedback"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// The review id is the path segment before "peer-feedback".
function reviewId(req: NextRequest): string {
  const parts = req.nextUrl.pathname.split("/")
  const i = parts.indexOf("peer-feedback")
  return i > 0 ? (parts[i - 1] ?? "") : ""
}

async function loadReview(rid: string, companyId: string) {
  const [row] = await db
    .select({ id: reviews.id, userId: reviews.userId })
    .from(reviews)
    .where(and(eq(reviews.id, rid), eq(reviews.companyId, companyId)))
    .limit(1)
  return row ?? null
}

export interface PeerFeedbackDto {
  id: string
  peerId: string
  peerName: string | null
  status: "pending" | "submitted" | "declined"
  rating: number | null
  comments: string | null
  requestedAt: string
  submittedAt: string | null
}

// GET — attributed peer feedback + aggregate for a review. Gated by
// hr.reviews.read (managers / HR); the review subject does not see attributed
// peer detail here.
export const GET = withGates(
  { action: "hr.reviews.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rid = reviewId(req)
    if (!rid) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const review = await loadReview(rid, ctx.session.companyId)
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 })

    const rows = await db
      .select({
        id: reviewPeerFeedback.id,
        peerId: reviewPeerFeedback.peerId,
        status: reviewPeerFeedback.status,
        rating: reviewPeerFeedback.rating,
        comments: reviewPeerFeedback.comments,
        requestedAt: reviewPeerFeedback.requestedAt,
        submittedAt: reviewPeerFeedback.submittedAt,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(reviewPeerFeedback)
      .leftJoin(users, eq(reviewPeerFeedback.peerId, users.id))
      .where(eq(reviewPeerFeedback.reviewId, rid))
      .orderBy(desc(reviewPeerFeedback.requestedAt))

    const feedback: PeerFeedbackDto[] = rows.map((r) => ({
      id: r.id,
      peerId: r.peerId,
      peerName:
        r.firstName || r.lastName ? `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() : null,
      status: r.status,
      rating: r.rating,
      comments: r.comments,
      requestedAt: r.requestedAt.toISOString(),
      submittedAt: r.submittedAt?.toISOString() ?? null,
    }))

    const summaryItems: PeerFeedbackItem[] = rows.map((r) => ({
      id: r.id,
      peerId: r.peerId,
      status: r.status,
      rating: r.rating,
    }))

    return NextResponse.json({ feedback, summary: summarizePeerFeedback(summaryItems) })
  }
)

// POST — request peer feedback from a company member. Gated by hr.reviews.write.
const createSchema = z.object({ peerId: z.string().uuid() })

export const POST = withGates(
  { action: "hr.reviews.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const rid = reviewId(req)
    if (!rid) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { companyId, userId, sessionId } = ctx.session

    const review = await loadReview(rid, companyId)
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 })

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = createSchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

    const { peerId } = parsed.data

    // A peer is never the review subject — self-as-peer is meaningless.
    if (peerId === review.userId)
      return NextResponse.json(
        { error: "Colegul evaluat nu poate fi propriul peer" },
        { status: 422 }
      )

    // The peer must be a member of this company (scope safety).
    const [member] = await db
      .select({ userId: companyMemberships.userId })
      .from(companyMemberships)
      .where(
        and(eq(companyMemberships.companyId, companyId), eq(companyMemberships.userId, peerId))
      )
      .limit(1)
    if (!member)
      return NextResponse.json({ error: "Peer must be a member of this company" }, { status: 422 })

    // Idempotent against the unique (review, peer) constraint.
    const [existing] = await db
      .select({ id: reviewPeerFeedback.id })
      .from(reviewPeerFeedback)
      .where(and(eq(reviewPeerFeedback.reviewId, rid), eq(reviewPeerFeedback.peerId, peerId)))
      .limit(1)
    if (existing)
      return NextResponse.json(
        { error: "Peer already requested", id: existing.id },
        { status: 409 }
      )

    const [created] = await db
      .insert(reviewPeerFeedback)
      .values({ companyId, reviewId: rid, peerId, requestedById: userId })
      .returning({ id: reviewPeerFeedback.id })

    if (!created) return NextResponse.json({ error: "Insert failed" }, { status: 500 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "hr.reviews.peer_request",
      entityType: "review_peer_feedback",
      entityId: created.id,
      payload: { reviewId: rid, peerId },
      method: "POST",
      path: `/api/reviews/${rid}/peer-feedback`,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ id: created.id }, { status: 201 })
  }
)
