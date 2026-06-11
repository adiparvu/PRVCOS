import { withGates } from "@/lib/with-gates"
import { writeAuditLog } from "@prv/auth"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { productReviews } from "@prv/db/schema"
import { and, desc, eq, isNull, lt } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ReviewRow {
  id: string
  productId: string
  rating: number
  title: string | null
  body: string | null
  authorName: string | null
  isVerifiedPurchase: boolean
  helpfulCount: number
  createdAt: string
}

export const GET = withGates(
  { action: "shop.reviews.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get("productId")
    const cursor = searchParams.get("cursor")
    const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10)
    const limit = Math.min(isNaN(rawLimit) || rawLimit < 1 ? 20 : rawLimit, 100)
    const { companyId } = ctx.session

    const conditions = [
      eq(productReviews.companyId, companyId),
      eq(productReviews.isApproved, true),
      isNull(productReviews.deletedAt),
    ]

    if (productId) conditions.push(eq(productReviews.productId, productId))
    if (cursor) conditions.push(lt(productReviews.createdAt, new Date(cursor)))

    const rows = await db
      .select({
        id: productReviews.id,
        productId: productReviews.productId,
        rating: productReviews.rating,
        title: productReviews.title,
        body: productReviews.body,
        authorName: productReviews.authorName,
        isVerifiedPurchase: productReviews.isVerifiedPurchase,
        helpfulCount: productReviews.helpfulCount,
        createdAt: productReviews.createdAt,
      })
      .from(productReviews)
      .where(and(...conditions))
      .orderBy(desc(productReviews.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const page = rows.slice(0, limit)
    const nextCursor =
      hasMore && page.length > 0 ? page[page.length - 1]!.createdAt.toISOString() : null

    const mapped: ReviewRow[] = page.map((r) => ({
      id: r.id,
      productId: r.productId,
      rating: r.rating,
      title: r.title,
      body: r.body,
      authorName: r.authorName,
      isVerifiedPurchase: r.isVerifiedPurchase,
      helpfulCount: r.helpfulCount,
      createdAt: r.createdAt.toISOString(),
    }))

    const avgRating =
      mapped.length > 0
        ? Math.round((mapped.reduce((s, r) => s + r.rating, 0) / mapped.length) * 10) / 10
        : null

    return NextResponse.json({
      reviews: mapped,
      count: mapped.length,
      avgRating,
      hasMore,
      nextCursor,
    })
  }
)

export const POST = withGates(
  { action: "shop.reviews.create", endpointClass: "api_write" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    const body = await req.json()
    const { productId, rating, title, reviewBody, authorName } = body as {
      productId?: string
      rating?: number
      title?: string
      reviewBody?: string
      authorName?: string
    }

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 })
    }
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "rating must be 1–5" }, { status: 400 })
    }

    const { companyId, userId } = ctx.session

    const [inserted] = await db
      .insert(productReviews)
      .values({
        companyId,
        productId,
        userId,
        rating,
        title: title ?? null,
        body: reviewBody ?? null,
        authorName: authorName ?? null,
        isApproved: true,
      })
      .returning()

    if (!inserted) {
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    await writeAuditLog({
      companyId,
      actorId: userId,
      sessionId: ctx.session.sessionId,
      action: "shop.reviews.create",
      entityType: "product_review",
      entityId: inserted.id,
      payload: { productId, rating },
    })

    const review: ReviewRow = {
      id: inserted.id,
      productId: inserted.productId,
      rating: inserted.rating,
      title: inserted.title,
      body: inserted.body,
      authorName: inserted.authorName,
      isVerifiedPurchase: inserted.isVerifiedPurchase,
      helpfulCount: inserted.helpfulCount,
      createdAt: inserted.createdAt.toISOString(),
    }

    return NextResponse.json({ review }, { status: 201 })
  }
)
