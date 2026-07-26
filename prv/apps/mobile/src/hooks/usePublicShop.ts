import { useQuery } from "@tanstack/react-query"
import { COMPANY_SLUG, PRODUCT_PAGE_SIZE } from "@/lib/public-config"

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

interface ProductsResponse {
  products: PublicProduct[]
  count: number
  /** Present only when the catalogue could not be scoped to a company. An empty
   *  list WITH a reason is a configuration fault, not "this shop is empty". */
  reason?: "no_public_company" | "unknown_company"
}

export interface PublicShopResult {
  products: PublicProduct[]
  categories: string[]
  misconfigured: boolean
}

// The public endpoints take no Authorization header; a plain fetch keeps them
// independent of session state.
async function fetchProducts(): Promise<PublicShopResult> {
  const url =
    `${process.env.EXPO_PUBLIC_API_URL}/api/public/shop/products` +
    `?companySlug=${encodeURIComponent(COMPANY_SLUG)}&limit=${PRODUCT_PAGE_SIZE}`

  const res = await fetch(url, { headers: { "Content-Type": "application/json" } })
  if (!res.ok) throw new Error("Could not load the catalogue.")

  const data = (await res.json()) as ProductsResponse
  const products = data.products ?? []

  // No public categories endpoint exists, so the filter list is derived from the
  // catalogue itself. Note the response carries category NAMES while the API's
  // ?category= filter expects slugs — the two cannot be round-tripped, so
  // filtering is done client-side on the name.
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort()

  return { products, categories, misconfigured: Boolean(data.reason) }
}

export function usePublicShop() {
  return useQuery({ queryKey: ["public-shop", COMPANY_SLUG], queryFn: fetchProducts })
}
