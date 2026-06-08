import { ProductDetailClient } from "./ProductDetailClient"

export const dynamic = "force-dynamic"

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  return <ProductDetailClient id={params.id} />
}
