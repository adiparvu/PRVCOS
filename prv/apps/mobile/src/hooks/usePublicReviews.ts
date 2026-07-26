import { useInfiniteQuery } from "@tanstack/react-query"
import { COMPANY_SLUG } from "@/lib/public-config"

export interface PublicReview {
  id: string
  rating: number
  title: string | null
  body: string | null
  author: string | null
  isVerifiedPurchase: boolean
  createdAt: string
}

export interface PublicReviewsPage {
  summary: { avgRating: number | null; totalCount: number }
  reviews: PublicReview[]
  hasMore: boolean
  nextCursor: string | null
  reason?: string
}

// Public, unauthenticated — same plain-fetch discipline as usePublicShop.
// First page is small (the section shows a handful inline); "See all" pulls
// subsequent pages of 10 through the cursor.
async function fetchReviews(
  productId: string,
  cursor: string | null,
  limit: number
): Promise<PublicReviewsPage> {
  const params = new URLSearchParams({ companySlug: COMPANY_SLUG, limit: String(limit) })
  if (cursor) params.set("cursor", cursor)
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/public/shop/products/${productId}/reviews?${params}`,
    { headers: { "Content-Type": "application/json" } }
  )
  if (!res.ok) throw new Error("Could not load reviews.")
  return (await res.json()) as PublicReviewsPage
}

export function usePublicReviews(productId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["public-reviews", COMPANY_SLUG, productId],
    enabled: !!productId,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchReviews(productId!, pageParam, pageParam ? 10 : 3),
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  })
}
