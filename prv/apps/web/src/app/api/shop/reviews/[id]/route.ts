import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { writeAuditLog } from "@prv/auth"
import { z } from "zod"
import { db } from "@prv/db"
import { productReviews } from "@prv/db/schema"
import { and, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function reviewId(req: NextRequest) {
  return req.nextUrl.pathname.split("/").pop() ?? ""
}

async function resolveReview(id: string, companyId: string) {
  const [review] = await db
    .select()
    .from(productReviews)
    .where(
      and(eq(productReviews.id, id), eq(productReviews.companyId, companyId), isNull(productReviews.deletedAt))
    )
    .limit(1)
  return review ?? null
}

// ── GET /api/shop/reviews/[id] ────────────────────────────────────────────────

export const GET = withGates(
  { action: "shop.reviews.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { companyId } = ctx.session
    const review = await resolveReview(reviewId(req), companyId)
    if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ review })
  }
)

// ── PATCH /api/shop/reviews/[id] ──────────────────────────────────────────────
// Staff can moderate: approve/un-approve, update body, title.

const patchSchema = z.object({
  title: z.string().max(255).nullable().optional(),
  body: z.string().nullable().optional(),
  isApproved: z.boolean().optional(),
  authorName: z.string().max(100).nullable().optional(),
})

export const PATCH = withGates(
  { action: "shop.reviews.moderate", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = reviewId(req)
    const { companyId, userId, sessionId } = ctx.session

    const review = await resolveReview(id, companyId)
    if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 422 }
      )

    const [updated] = await db
      .update(productReviews)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(productReviews.id, id), eq(productReviews.companyId, companyId)))
      .returning({
        id: productReviews.id,
        isApproved: productReviews.isApproved,
        rating: productReviews.rating,
      })

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "shop.reviews.moderate",
      entityType: "product_review",
      entityId: id,
      payload: parsed.data,
      method: "PATCH",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  }
)

// ── DELETE /api/shop/reviews/[id] ─────────────────────────────────────────────

export const DELETE = withGates(
  { action: "shop.reviews.delete", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const id = reviewId(req)
    const { companyId, userId, sessionId } = ctx.session

    const review = await resolveReview(id, companyId)
    if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await db
      .update(productReviews)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(productReviews.id, id), eq(productReviews.companyId, companyId)))

    void writeAuditLog({
      companyId,
      actorId: userId,
      sessionId,
      action: "shop.reviews.delete",
      entityType: "product_review",
      entityId: id,
      payload: { productId: review.productId, rating: review.rating },
      method: "DELETE",
      path: req.nextUrl.pathname,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return new NextResponse(null, { status: 204 })
  }
)
