import { NextRequest, NextResponse } from "next/server"
import { db } from "@prv/db"
import { products, productCategories } from "@prv/db/schema"
import { productReviews } from "@prv/db/schema"
import { and, avg, count, desc, eq, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface PublicProduct {
  id: string
  name: string
  price: number
  category: string
  imageUrl: string | null
  outOfStock: boolean
  rating: number
  reviews: number
}

// GET /api/public/shop/products — no auth required
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200)
  const categorySlug = searchParams.get("category")

  // Subquery: avg rating + review count per product
  const ratingSq = db
    .select({
      productId: productReviews.productId,
      avgRating: avg(productReviews.rating).as("avg_rating"),
      reviewCount: count(productReviews.id).as("review_count"),
    })
    .from(productReviews)
    .where(eq(productReviews.isApproved, true))
    .groupBy(productReviews.productId)
    .as("rating_sq")

  const baseWhere = and(
    eq(products.status, "active"),
    eq(products.isActive, true),
    isNull(products.deletedAt),
    categorySlug ? eq(productCategories.slug, categorySlug) : undefined
  )

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      imageUrls: products.imageUrls,
      stockQuantity: products.stockQuantity,
      categoryName: productCategories.name,
      avgRating: ratingSq.avgRating,
      reviewCount: ratingSq.reviewCount,
    })
    .from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .leftJoin(ratingSq, eq(products.id, ratingSq.productId))
    .where(baseWhere)
    .orderBy(desc(products.updatedAt))
    .limit(limit)

  const result: PublicProduct[] = rows.map((r) => {
    const imageUrls = Array.isArray(r.imageUrls) ? (r.imageUrls as string[]) : []
    return {
      id: r.id,
      name: r.name,
      price: Number(r.price),
      category: r.categoryName ?? "General",
      imageUrl: imageUrls[0] ?? null,
      outOfStock: r.stockQuantity <= 0,
      rating: r.avgRating !== null ? Math.round(Number(r.avgRating) * 10) / 10 : 0,
      reviews: r.reviewCount ?? 0,
    }
  })

  return NextResponse.json({ products: result, count: result.length })
}
