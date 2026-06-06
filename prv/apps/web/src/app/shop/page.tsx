import { ShopStorefront } from "./ShopStorefront"

export const metadata = { title: "Shop" }

// Public storefront — no authentication required.
export default function ShopPage() {
  return (
    <div className="pt-14 pb-28 max-w-2xl mx-auto">
      <ShopStorefront />
    </div>
  )
}
