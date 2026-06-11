import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { productReviews } from "@prv/db/schema"
import { and, eq, isNull, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const PATCH = withGates(
  { action: "shop.reviews.helpful", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    // Extract review id from path: /api/shop/reviews/[id]/helpful
    const pathParts = req.nextUrl.pathname.split("/").filter(Boolean)
    const reviewsIdx = pathParts.indexOf("reviews")
    const reviewId = pathParts[reviewsIdx + 1] ?? ""

    if (!reviewId) {
      return NextResponse.json({ error: "Missing review id" }, { status: 400 })
    }

    const { companyId, userId } = ctx.session

    // Atomic increment — only approved, non-deleted reviews
    const [updated] = await db
      .update(productReviews)
      .set({
        helpfulCount: sql`${productReviews.helpfulCount} + 1`,
      })
      .where(
        and(
          eq(productReviews.id, reviewId),
          eq(productReviews.companyId, companyId),
          eq(productReviews.isApproved, true),
          isNull(productReviews.deletedAt)
        )
      )
      .returning({ id: productReviews.id, helpfulCount: productReviews.helpfulCount })

    if (!updated) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    await writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "shop.reviews.helpful",
      entityType: "product_review",
      entityId: reviewId,
      payload: { helpfulCount: updated.helpfulCount },
    })

    return NextResponse.json({ helpfulCount: updated.helpfulCount })
  }
)
