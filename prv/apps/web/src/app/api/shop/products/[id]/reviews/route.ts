import { withGates } from "@/lib/with-gates"
import { NextRequest, NextResponse } from "next/server"
import type { GateContext } from "@prv/auth"
import { db } from "@prv/db"
import { productReviews } from "@prv/db/schema"
import { and, asc, desc, eq, isNull, lt, sql } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface ProductReviewRow {
  id: string
  rating: number
  title: string | null
  body: string | null
  authorName: string | null
  isVerifiedPurchase: boolean
  helpfulCount: number
  createdAt: string
}

export interface ProductReviewSummary {
  totalCount: number
  avgRating: number | null
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>
  reviews: ProductReviewRow[]
  hasMore: boolean
  nextCursor: string | null
}

export const GET = withGates(
  { action: "shop.reviews.read", endpointClass: "api_read" },
  async (req: NextRequest, ctx: GateContext): Promise<NextResponse> => {
    // Extract product id from path: /api/shop/products/[id]/reviews
    const pathParts = req.nextUrl.pathname.split("/").filter(Boolean)
    const productId = pathParts[pathParts.indexOf("products") + 1] ?? ""
    if (!productId) return NextResponse.json({ error: "Missing product id" }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get("cursor")
    const sort = searchParams.get("sort") ?? "recent" // "recent" | "helpful" | "top"
    const rawLimit = parseInt(searchParams.get("limit") ?? "10", 10)
    const limit = Math.min(isNaN(rawLimit) || rawLimit < 1 ? 10 : rawLimit, 50)
    const { companyId } = ctx.session

    const baseConditions = [
      eq(productReviews.companyId, companyId),
      eq(productReviews.productId, productId),
      eq(productReviews.isApproved, true),
      isNull(productReviews.deletedAt),
    ]

    if (cursor) baseConditions.push(lt(productReviews.createdAt, new Date(cursor)))

    const orderClause =
      sort === "helpful"
        ? desc(productReviews.helpfulCount)
        : sort === "top"
          ? desc(productReviews.rating)
          : desc(productReviews.createdAt)

    const [rows, statsRows] = await Promise.all([
      db
        .select({
          id: productReviews.id,
          rating: productReviews.rating,
          title: productReviews.title,
          body: productReviews.body,
          authorName: productReviews.authorName,
          isVerifiedPurchase: productReviews.isVerifiedPurchase,
          helpfulCount: productReviews.helpfulCount,
          createdAt: productReviews.createdAt,
        })
        .from(productReviews)
        .where(and(...baseConditions))
        .orderBy(orderClause, asc(productReviews.id))
        .limit(limit + 1),

      db
        .select({
          rating: productReviews.rating,
          cnt: sql<number>`cast(count(*) as int)`,
        })
        .from(productReviews)
        .where(
          and(
            eq(productReviews.companyId, companyId),
            eq(productReviews.productId, productId),
            eq(productReviews.isApproved, true),
            isNull(productReviews.deletedAt)
          )
        )
        .groupBy(productReviews.rating),
    ])

    const hasMore = rows.length > limit
    const page = rows.slice(0, limit)
    const nextCursor =
      hasMore && page.length > 0 ? page[page.length - 1]!.createdAt.toISOString() : null

    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let totalCount = 0
    let ratingSum = 0

    for (const s of statsRows) {
      const r = s.rating as number
      if (r >= 1 && r <= 5) {
        breakdown[r] = s.cnt
        totalCount += s.cnt
        ratingSum += r * s.cnt
      }
    }

    const avgRating = totalCount > 0 ? Math.round((ratingSum / totalCount) * 10) / 10 : null

    const reviews: ProductReviewRow[] = page.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      authorName: r.authorName,
      isVerifiedPurchase: r.isVerifiedPurchase,
      helpfulCount: r.helpfulCount,
      createdAt: r.createdAt.toISOString(),
    }))

    const summary: ProductReviewSummary = {
      totalCount,
      avgRating,
      breakdown: breakdown as ProductReviewSummary["breakdown"],
      reviews,
      hasMore,
      nextCursor,
    }

    return NextResponse.json(summary)
  }
)
