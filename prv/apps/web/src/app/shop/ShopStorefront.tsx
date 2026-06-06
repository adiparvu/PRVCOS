"use client"

import { useMemo, useState } from "react"
import {
  GlassProductCard,
  GlassRangeSlider,
  GlassCartLineItem,
  StandardSheet,
  type RangeValue,
} from "@prv/ui"

// ── Placeholder catalog ───────────────────────────────────────────────────────
// Static catalog with inline gradient images (CSP-safe data: URIs). Real product
// data + Supabase Storage photos are a later backend task.

function gradientImage(from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

interface Product {
  id: string
  name: string
  category: string
  price: number
  wasPrice?: number
  rating: number
  reviews: number
  badge?: { label: string; variant?: "sale" | "new" }
  outOfStock?: boolean
  image: string
  variant?: string
}

const CATALOG: Product[] = [
  {
    id: "drill",
    name: "Cordless Drill 18V",
    category: "Power Tools",
    price: 149,
    rating: 4.7,
    reviews: 212,
    badge: { label: "New", variant: "new" },
    image: gradientImage("#0A84FF", "#5E5CE6"),
    variant: "Blue · 2 batteries",
  },
  {
    id: "laminate",
    name: "Oak Laminate · m²",
    category: "Flooring",
    price: 22,
    wasPrice: 32,
    rating: 4.9,
    reviews: 540,
    badge: { label: "-31%", variant: "sale" },
    image: gradientImage("#FF9F0A", "#FF375F"),
    variant: "Natural",
  },
  {
    id: "paint",
    name: "Matte White 5L",
    category: "Paint",
    price: 39,
    rating: 4.5,
    reviews: 98,
    outOfStock: true,
    image: gradientImage("#30D158", "#00C7BE"),
  },
  {
    id: "tap",
    name: "Mixer Tap Chrome",
    category: "Plumbing",
    price: 85,
    rating: 4.6,
    reviews: 76,
    image: gradientImage("#BF5AF2", "#FF6482"),
    variant: "Chrome",
  },
  {
    id: "led",
    name: "LED Panel 40W",
    category: "Electrical",
    price: 28,
    rating: 4.4,
    reviews: 134,
    image: gradientImage("#64D2FF", "#0A84FF"),
  },
  {
    id: "saw",
    name: "Circular Saw 1200W",
    category: "Power Tools",
    price: 210,
    rating: 4.8,
    reviews: 309,
    image: gradientImage("#5E5CE6", "#BF5AF2"),
  },
]

const CATEGORIES = ["All", "Power Tools", "Flooring", "Paint", "Plumbing", "Electrical"]
const PRICE_MIN = 0
const PRICE_MAX = 600

const euro = (v: number) => `€${v}`

// ── Component ─────────────────────────────────────────────────────────────────

export function ShopStorefront() {
  const [category, setCategory] = useState("All")
  const [range, setRange] = useState<RangeValue>([20, 520])
  const [favorites, setFavorites] = useState<Set<string>>(new Set(["laminate"]))
  const [cart, setCart] = useState<Record<string, number>>({})
  const [cartOpen, setCartOpen] = useState(false)

  const filtered = useMemo(
    () =>
      CATALOG.filter(
        (p) =>
          (category === "All" || p.category === category) &&
          p.price >= range[0] &&
          p.price <= range[1]
      ),
    [category, range]
  )

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const product = CATALOG.find((p) => p.id === id)
          return product ? { product, qty } : null
        })
        .filter((x): x is { product: Product; qty: number } => x !== null),
    [cart]
  )

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartTotal = cartItems.reduce((sum, { product, qty }) => sum + product.price * qty, 0)

  const toggleFav = (id: string) =>
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const addToCart = (id: string) => setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))

  const setQty = (id: string, qty: number) => setCart((prev) => ({ ...prev, [id]: qty }))

  const removeFromCart = (id: string) =>
    setCart((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })

  return (
    <div className="px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">PRV Shop</p>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight">Shop</h1>
        </div>
        <button
          type="button"
          aria-label="Open cart"
          onClick={() => setCartOpen(true)}
          className="relative w-[42px] h-[42px] rounded-[13px] flex items-center justify-center"
          style={{ background: "var(--prv-g2)", border: "1px solid var(--prv-border)" }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--prv-text-1)"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.7 13H19l3-8H6" />
          </svg>
          {cartCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1.5"
              style={{ background: "var(--prv-accent)" }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3.5">
        {CATEGORIES.map((c) => {
          const on = c === category
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-semibold"
              style={{
                background: on ? "var(--prv-g3)" : "var(--prv-g2)",
                border: `1px solid ${on ? "var(--prv-border)" : "var(--prv-border-subtle)"}`,
                color: on ? "var(--prv-text-1)" : "var(--prv-text-3)",
              }}
            >
              {c}
            </button>
          )
        })}
      </div>

      {/* Price filter */}
      <div
        className="rounded-[16px] p-4 mb-[18px] relative"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <p className="text-[12px] font-semibold text-white/35 mb-3">Price range</p>
        <GlassRangeSlider
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={5}
          value={range}
          onChange={setRange}
          formatLabel={euro}
        />
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <p className="text-white/35 text-[14px] text-center py-12">
          No products match your filters
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3.5">
          {filtered.map((p) => (
            <GlassProductCard
              key={p.id}
              name={p.name}
              image={p.image}
              category={p.category}
              price={p.price}
              wasPrice={p.wasPrice}
              rating={p.rating}
              reviews={p.reviews}
              badge={p.badge}
              outOfStock={p.outOfStock}
              favorite={favorites.has(p.id)}
              onToggleFavorite={() => toggleFav(p.id)}
              onAdd={() => addToCart(p.id)}
            />
          ))}
        </div>
      )}

      {/* Cart sheet */}
      <StandardSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title={`Your cart · ${cartCount} item${cartCount === 1 ? "" : "s"}`}
      >
        {cartItems.length === 0 ? (
          <p className="text-white/35 text-[14px] text-center py-10">Your cart is empty</p>
        ) : (
          <>
            <div className="flex flex-col">
              {cartItems.map(({ product, qty }) => (
                <GlassCartLineItem
                  key={product.id}
                  name={product.name}
                  image={product.image}
                  variant={product.variant}
                  price={`€${product.price * qty}`}
                  quantity={qty}
                  onQuantityChange={(q) => setQty(product.id, q)}
                  onRemove={() => removeFromCart(product.id)}
                />
              ))}
            </div>

            <div
              className="flex justify-between pt-4 mt-1 text-[16px] font-bold"
              style={{ borderTop: "1px solid var(--prv-border)" }}
            >
              <span>Total</span>
              <span>€{cartTotal}</span>
            </div>

            <button
              type="button"
              className="w-full mt-4 py-3.5 rounded-[14px] text-black text-[14px] font-bold"
              style={{ background: "var(--prv-text-1)" }}
            >
              Checkout · €{cartTotal}
            </button>
          </>
        )}
      </StandardSheet>
    </div>
  )
}
