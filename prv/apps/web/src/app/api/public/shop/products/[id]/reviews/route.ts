import { NextRequest, NextResponse } from "next/server"
import { db } from "@prv/db"
import { companies, products, productReviews } from "@prv/db/schema"
import { and, avg, count, desc, eq, isNull, lt } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export interface PublicReview {
  id: string
  rating: number
  title: string | null
  body: string | null
  /** Display name only — first name + initial, derived server-side. */
  author: string | null
  isVerifiedPurchase: boolean
  createdAt: string
}

export interface PublicReviewsResponse {
  summary: { avgRating: number | null; totalCount: number }
  reviews: PublicReview[]
  hasMore: boolean
  nextCursor: string | null
  reason?: "no_public_company" | "unknown_company" | "unknown_product"
}

const EMPTY: Omit<PublicReviewsResponse, "reason"> = {
  summary: { avgRating: null, totalCount: 0 },
  reviews: [],
  hasMore: false,
  nextCursor: null,
}

/** "Andrei Popescu" → "Andrei P." — the public never sees a full name, no
 *  matter what the business app stored in author_name. */
function displayName(authorName: string | null): string | null {
  if (!authorName) return null
  const parts = authorName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null
  const first = parts[0]!
  const initial = parts.length > 1 ? ` ${parts[1]!.charAt(0).toUpperCase()}.` : ""
  return `${first}${initial}`
}

// GET /api/public/shop/products/[id]/reviews — no auth required.
//
// Same tenant discipline as the public products endpoint: unauthenticated, so
// it MUST be scoped to a single company and fail closed — an unresolvable
// company or a product outside that company returns nothing, never data from
// another tenant. Only approved, non-deleted reviews are ever exposed.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const pathParts = req.nextUrl.pathname.split("/").filter(Boolean)
  const productId = pathParts[pathParts.indexOf("products") + 1] ?? ""
  if (!productId) {
    return NextResponse.json({ ...EMPTY, reason: "unknown_product" }, { status: 400 })
  }

  const { searchParams } = req.nextUrl
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "10", 10) || 10, 1), 20)
  const cursor = searchParams.get("cursor")

  const slug = searchParams.get("companySlug") ?? process.env["PUBLIC_COMPANY_SLUG"] ?? null
  if (!slug) return NextResponse.json({ ...EMPTY, reason: "no_public_company" })

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.slug, slug))
    .limit(1)
  if (!company) return NextResponse.json({ ...EMPTY, reason: "unknown_company" })

  // The product must be publicly visible within this tenant — identical
  // conditions to the public catalogue, so reviews can never be read for a
  // product the catalogue itself would not show.
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.id, productId),
        eq(products.companyId, company.id),
        eq(products.status, "active"),
        eq(products.isActive, true),
        isNull(products.deletedAt)
      )
    )
    .limit(1)
  if (!product) return NextResponse.json({ ...EMPTY, reason: "unknown_product" }, { status: 404 })

  const visible = and(
    eq(productReviews.productId, product.id),
    eq(productReviews.companyId, company.id),
    eq(productReviews.isApproved, true),
    isNull(productReviews.deletedAt)
  )

  const [totals] = await db
    .select({ totalCount: count(productReviews.id), avgRating: avg(productReviews.rating) })
    .from(productReviews)
    .where(visible)

  const cursorDate = cursor ? new Date(cursor) : null
  const rows = await db
    .select({
      id: productReviews.id,
      rating: productReviews.rating,
      title: productReviews.title,
      body: productReviews.body,
      authorName: productReviews.authorName,
      isVerifiedPurchase: productReviews.isVerifiedPurchase,
      createdAt: productReviews.createdAt,
    })
    .from(productReviews)
    .where(
      cursorDate && !Number.isNaN(cursorDate.getTime())
        ? and(visible, lt(productReviews.createdAt, cursorDate))
        : visible
    )
    .orderBy(desc(productReviews.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const page = rows.slice(0, limit)
  const last = page[page.length - 1]

  const body: PublicReviewsResponse = {
    summary: {
      totalCount: totals?.totalCount ?? 0,
      avgRating: totals?.avgRating ? Math.round(Number(totals.avgRating) * 10) / 10 : null,
    },
    reviews: page.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      author: displayName(r.authorName),
      isVerifiedPurchase: r.isVerifiedPurchase,
      createdAt: r.createdAt.toISOString(),
    })),
    hasMore,
    nextCursor: hasMore && last ? last.createdAt.toISOString() : null,
  }
  return NextResponse.json(body)
}
