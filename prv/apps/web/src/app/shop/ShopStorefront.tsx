"use client"

import { useEffect, useMemo, useState } from "react"
import {
  GlassProductCard,
  GlassRangeSlider,
  GlassCartLineItem,
  StandardSheet,
  type RangeValue,
} from "@prv/ui"
import type { PublicProduct } from "@/app/api/public/shop/products/route"

// ── Gradient fallback for products without images ─────────────────────────────

const GRADIENT_POOL = [
  ["#0A84FF", "#5E5CE6"],
  ["#FF9F0A", "#FF375F"],
  ["#30D158", "#00C7BE"],
  ["#BF5AF2", "#FF6482"],
  ["#64D2FF", "#0A84FF"],
  ["#5E5CE6", "#BF5AF2"],
  ["#FF6482", "#FF9F0A"],
  ["#00C7BE", "#30D158"],
]

function gradientImage(idx: number): string {
  const [from, to] = GRADIENT_POOL[idx % GRADIENT_POOL.length]!
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// ── Local product type (superset of PublicProduct for UI) ─────────────────────

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
}

function mapToProduct(p: PublicProduct, idx: number): Product {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    rating: p.rating,
    reviews: p.reviews,
    outOfStock: p.outOfStock,
    image: p.imageUrl ?? gradientImage(idx),
  }
}

const PRICE_MIN = 0
const PRICE_MAX = 10_000
const euro = (v: number) => `€${v}`

// ── Component ─────────────────────────────────────────────────────────────────

export function ShopStorefront() {
  const [catalog, setCatalog] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState("Toate")
  const [range, setRange] = useState<RangeValue>([PRICE_MIN, PRICE_MAX])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [cart, setCart] = useState<Record<string, number>>({})
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch("/api/public/shop/products")
        if (!res.ok) return
        const data = (await res.json()) as { products: PublicProduct[] }
        if (cancelled) return
        setCatalog(data.products.map(mapToProduct))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    const unique = Array.from(new Set(catalog.map((p) => p.category)))
    return ["Toate", ...unique]
  }, [catalog])

  const maxPrice = useMemo(
    () => (catalog.length > 0 ? Math.max(...catalog.map((p) => p.price)) : PRICE_MAX),
    [catalog]
  )

  const filtered = useMemo(
    () =>
      catalog.filter(
        (p) =>
          (category === "Toate" || p.category === category) &&
          p.price >= range[0] &&
          p.price <= range[1]
      ),
    [catalog, category, range]
  )

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const product = catalog.find((p) => p.id === id)
          return product ? { product, qty } : null
        })
        .filter((x): x is { product: Product; qty: number } => x !== null),
    [cart, catalog]
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
          aria-label="Deschide coșul"
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
        {categories.map((c) => {
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
        <p className="text-[12px] font-semibold text-white/35 mb-3">Interval de preț</p>
        <GlassRangeSlider
          min={PRICE_MIN}
          max={maxPrice}
          step={5}
          value={range}
          onChange={setRange}
          formatLabel={euro}
        />
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[18px] aspect-[3/4]"
              style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-white/35 text-[14px] text-center py-12">
          Niciun produs nu corespunde filtrelor
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
        title={`Coșul tău · ${cartCount} ${cartCount === 1 ? "produs" : "produse"}`}
      >
        {cartItems.length === 0 ? (
          <p className="text-white/35 text-[14px] text-center py-10">Coșul tău este gol</p>
        ) : (
          <>
            <div className="flex flex-col">
              {cartItems.map(({ product, qty }) => (
                <GlassCartLineItem
                  key={product.id}
                  name={product.name}
                  image={product.image}
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
              Finalizează comanda · €{cartTotal}
            </button>
          </>
        )}
      </StandardSheet>
    </div>
  )
}
