import { NextRequest, NextResponse } from "next/server"
import { withGates } from "@/lib/with-gates"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { db } from "@prv/db"
import { reviewPeerFeedback } from "@prv/db/schema"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function feedbackId(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-1) ?? ""
}

// PATCH — the ASSIGNED peer submits their rating/comments or declines. No role
// gate (any authenticated employee): ownership is enforced on the row — only the
// peer named on the request, and only while it is still pending, may act.
const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("submit"),
    rating: z.number().int().min(1).max(5),
    comments: z.string().max(5000).nullable().optional(),
  }),
  z.object({ action: z.literal("decline") }),
])

export const PATCH = withGates(
  { action: "hr.reviews.peer_submit", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const fid = feedbackId(req)
    const { companyId, userId, sessionId } = ctx.session

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    const parsed = patchSchema.safeParse(raw)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

    const [row] = await db
      .select({
        id: reviewPeerFeedback.id,
        peerId: reviewPeerFeedback.peerId,
        status: reviewPeerFeedback.status,
      })
      .from(reviewPeerFeedback)
      .where(and(eq(reviewPeerFeedback.id, fid), eq(reviewPeerFeedback.companyId, companyId)))
      .limit(1)

    if (!row) return NextResponse.json({ error: "Request not found" }, { status: 404 })
    // Only the assigned peer may respond.
    if (row.peerId !== userId)
      return NextResponse.json({ error: "Not your peer review" }, { status: 403 })
    // A submitted/declined request is final.
    if (row.status !== "pending")
      return NextResponse.json({ error: "Already responded", code: "PEER_DONE" }, { status: 409 })

    const now = new Date()
    const patch =
      parsed.data.action === "submit"
        ? {
            status: "submitted" as const,
            rating: parsed.data.rating,
            comments: parsed.data.comments ?? null,
            submittedAt: now,
          }
        : { status: "declined" as const, submittedAt: now }

    // Guard status = pending in the WHERE so a concurrent response can't be clobbered.
    const [updated] = await db
      .update(reviewPeerFeedback)
      .set(patch)
      .where(and(eq(reviewPeerFeedback.id, fid), eq(reviewPeerFeedback.status, "pending")))
      .returning({ id: reviewPeerFeedback.id })

    if (!updated)
      return NextResponse.json({ error: "Already responded", code: "PEER_DONE" }, { status: 409 })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: `hr.reviews.peer_${parsed.data.action}`,
      entityType: "review_peer_feedback",
      entityId: fid,
      payload:
        parsed.data.action === "submit" ? { rating: parsed.data.rating } : { declined: true },
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ updated: true, status: patch.status })
  }
)

// DELETE — cancel a peer request. Gated by hr.reviews.write (the requester / HR).
// Only a pending request may be cancelled; a submitted/declined one is a record.
export const DELETE = withGates(
  { action: "hr.reviews.write", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const fid = feedbackId(req)
    const { companyId, userId, sessionId } = ctx.session

    const [deleted] = await db
      .delete(reviewPeerFeedback)
      .where(
        and(
          eq(reviewPeerFeedback.id, fid),
          eq(reviewPeerFeedback.companyId, companyId),
          eq(reviewPeerFeedback.status, "pending")
        )
      )
      .returning({ id: reviewPeerFeedback.id })

    if (!deleted)
      return NextResponse.json(
        { error: "Pending request not found (already responded?)" },
        { status: 404 }
      )

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "hr.reviews.peer_cancel",
      entityType: "review_peer_feedback",
      entityId: fid,
      payload: {},
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({ deleted: true })
  }
)
