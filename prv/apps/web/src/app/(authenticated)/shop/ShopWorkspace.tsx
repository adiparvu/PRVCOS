"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { Product, ProductCategory } from "@/app/api/shop/products/route"

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.35)"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function IconCart() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.75)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

function IconCartDark() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#000"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

function IconHeart() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.65)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

// Category icons
function CategoryIcon({ cat, size = 12 }: { cat: ProductCategory | "all"; size?: number }) {
  const s = { width: size, height: size }
  const base = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  if (cat === "tamplarie")
    return (
      <svg {...s} viewBox="0 0 24 24" {...base}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    )
  if (cat === "sanitare")
    return (
      <svg {...s} viewBox="0 0 24 24" {...base}>
        <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
      </svg>
    )
  if (cat === "electrice")
    return (
      <svg {...s} viewBox="0 0 24 24" {...base}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    )
  if (cat === "pardoseli")
    return (
      <svg {...s} viewBox="0 0 24 24" {...base}>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    )
  if (cat === "vopsele")
    return (
      <svg {...s} viewBox="0 0 24 24" {...base}>
        <path d="M18.37 2.63L14 7l-1.59-1.59a2 2 0 00-2.82 0L8 7l9 9 1.59-1.59a2 2 0 000-2.82L17 10l4.37-4.37a2.12 2.12 0 00-3-3z" />
        <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7" />
      </svg>
    )
  if (cat === "scule")
    return (
      <svg {...s} viewBox="0 0 24 24" {...base}>
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    )
  // all — grid icon
  return (
    <svg {...s} viewBox="0 0 24 24" {...base}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(p: Product) {
  const price = `€${p.price}`
  if (p.unit === "m²" || p.unit === "sac") return `${price}/${p.unit}`
  return price
}

type CatFilter = "all" | ProductCategory

const CATS: { id: CatFilter; label: string }[] = [
  { id: "all", label: "Toate" },
  { id: "tamplarie", label: "Tâmplărie" },
  { id: "sanitare", label: "Sanitare" },
  { id: "electrice", label: "Electrice" },
  { id: "pardoseli", label: "Pardoseli" },
  { id: "vopsele", label: "Vopsele" },
  { id: "scule", label: "Scule" },
]

const BADGE_CONFIG: Record<
  "sale" | "new" | "low-stock",
  { label: string; color: string; bg: string }
> = {
  sale: { label: "Reducere", color: "rgba(255,69,58,0.9)", bg: "rgba(255,69,58,0.15)" },
  new: { label: "Nou", color: "rgba(48,209,88,0.9)", bg: "rgba(48,209,88,0.14)" },
  "low-stock": {
    label: "Stoc limitat",
    color: "rgba(255,159,10,0.9)",
    bg: "rgba(255,159,10,0.14)",
  },
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: "52px 0 100px", maxWidth: 480, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 16px",
          marginBottom: 14,
        }}
      >
        <div
          style={{ width: 80, height: 28, background: "rgba(255,255,255,0.08)", borderRadius: 8 }}
          className="animate-pulse"
        />
        <div
          style={{ width: 36, height: 36, background: "rgba(255,255,255,0.08)", borderRadius: 100 }}
          className="animate-pulse"
        />
      </div>
      <div
        style={{
          margin: "0 16px 14px",
          height: 40,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 100,
        }}
        className="animate-pulse"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          padding: "0 16px",
          marginTop: 24,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              height: 220,
              background: "rgba(255,255,255,0.05)",
              borderRadius: 18,
            }}
            className="animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}

// ── Cart sheet ────────────────────────────────────────────────────────────────

interface CartItem {
  product: Product
  qty: number
}

function CartSheet({
  items,
  onClose,
  onQtyChange,
  onPlaceOrder,
  placing,
}: {
  items: CartItem[]
  onClose: () => void
  onQtyChange: (id: string, delta: number) => void
  onPlaceOrder: () => void
  placing: boolean
}) {
  const total = items.reduce((s, i) => s + i.product.price * i.qty, 0)
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }}
      />
      <div
        style={{
          position: "relative",
          background: "rgba(20,20,20,0.96)",
          backdropFilter: "blur(48px)",
          WebkitBackdropFilter: "blur(48px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px 24px 0 0",
          padding: "20px 20px 40px",
          maxHeight: "70vh",
          overflowY: "auto",
          boxShadow: "0 -24px 64px rgba(0,0,0,0.7)",
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 100,
            background: "rgba(255,255,255,0.20)",
            margin: "0 auto 16px",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
            Coș ({items.reduce((s, i) => s + i.qty, 0)})
          </p>
          <p style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
            €{total.toLocaleString("ro-RO")}
          </p>
        </div>
        {items.length === 0 && (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.30)", padding: "32px 0" }}>
            Coșul este gol
          </p>
        )}
        {items.map(({ product, qty }) => (
          <div
            key={product.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>
                {product.name}
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                {fmtPrice(product)}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => onQtyChange(product.id, -1)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 100,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "rgba(255,255,255,0.80)",
                  fontSize: 16,
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                −
              </button>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.90)",
                  minWidth: 20,
                  textAlign: "center",
                }}
              >
                {qty}
              </span>
              <button
                onClick={() => onQtyChange(product.id, 1)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 100,
                  background: "rgba(255,255,255,0.10)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "rgba(255,255,255,0.80)",
                  fontSize: 16,
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +
              </button>
            </div>
          </div>
        ))}
        {items.length > 0 && (
          <button
            onClick={onPlaceOrder}
            disabled={placing}
            style={{
              width: "100%",
              marginTop: 20,
              padding: "13px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.92)",
              color: "#000",
              fontSize: 15,
              fontWeight: 700,
              border: "none",
              cursor: placing ? "default" : "pointer",
              opacity: placing ? 0.7 : 1,
            }}
          >
            {placing ? "Se procesează..." : "Finalizează comanda"}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onAdd,
  onNavigate,
}: {
  product: Product
  onAdd: (p: Product) => void
  onNavigate: (id: string) => void
}) {
  const badge = product.badge ? BADGE_CONFIG[product.badge] : null
  return (
    <div
      onClick={() => onNavigate(product.id)}
      style={{
        borderRadius: 18,
        overflow: "hidden",
        position: "relative",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.11)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          height: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.40)",
        }}
      >
        <CategoryIcon cat={product.category} size={42} />
      </div>
      <div style={{ padding: "10px 11px 12px" }}>
        {badge && (
          <span
            style={{
              display: "inline-block",
              padding: "2px 7px",
              borderRadius: 5,
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.04em",
              marginBottom: 4,
              background: badge.bg,
              color: badge.color,
            }}
          >
            {badge.label}
          </span>
        )}
        <p
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
            color: "rgba(255,255,255,0.32)",
            marginBottom: 3,
          }}
        >
          {CATS.find((c) => c.id === product.category)?.label}
        </p>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(255,255,255,0.88)",
            lineHeight: 1.3,
          }}
        >
          {product.name}
        </p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 7 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              letterSpacing: "-0.3px",
            }}
          >
            {fmtPrice(product)}
          </span>
          {product.oldPrice && (
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.28)",
                textDecoration: "line-through",
                fontWeight: 400,
              }}
            >
              €{product.oldPrice}
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAdd(product)
          }}
          style={{
            width: "100%",
            marginTop: 8,
            padding: 8,
            borderRadius: 10,
            background: "rgba(255,255,255,0.09)",
            border: "1px solid rgba(255,255,255,0.11)",
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.70)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          <IconPlus /> Adaugă în coș
        </button>
      </div>
    </div>
  )
}

// ── Featured card ─────────────────────────────────────────────────────────────

function FeatCard({ product, onNavigate }: { product: Product; onNavigate: (id: string) => void }) {
  return (
    <div
      onClick={() => onNavigate(product.id)}
      style={{
        flexShrink: 0,
        width: 155,
        borderRadius: 18,
        overflow: "hidden",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.11)",
        position: "relative",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          height: 105,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.40)",
        }}
      >
        <CategoryIcon cat={product.category} size={36} />
      </div>
      <div style={{ padding: "9px 10px 11px" }}>
        <p
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
            color: "rgba(255,255,255,0.32)",
            marginBottom: 3,
          }}
        >
          {CATS.find((c) => c.id === product.category)?.label}
        </p>
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.88)",
            lineHeight: 1.35,
          }}
        >
          {product.name}
        </p>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            marginTop: 6,
          }}
        >
          {fmtPrice(product)}
        </p>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

const CART_KEY = "prv_shop_cart"

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = sessionStorage.getItem(CART_KEY)
    if (!raw) return []
    const stored = JSON.parse(raw) as { id: string; name: string; price: number; qty: number }[]
    return stored.map((s) => ({
      product: { id: s.id, name: s.name, price: s.price } as Product,
      qty: s.qty,
    }))
  } catch {
    return []
  }
}

function persistCart(items: CartItem[]) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(
    CART_KEY,
    JSON.stringify(
      items.map((i) => ({
        id: i.product.id,
        name: i.product.name,
        price: i.product.price,
        qty: i.qty,
      }))
    )
  )
}

export function ShopWorkspace() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<CatFilter>("all")
  const [search, setSearch] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [placing, setPlacing] = useState(false)
  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/shop/products")
      const data = await res.json()
      setProducts(data.products ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    setCart(readStoredCart())
  }, [load])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      const next = existing
        ? prev.map((i) => (i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i))
        : [...prev, { product, qty: 1 }]
      persistCart(next)
      return next
    })
  }

  const changeQty = (id: string, delta: number) => {
    setCart((prev) => {
      const next = prev
        .map((i) => (i.product.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
      persistCart(next)
      return next
    })
  }

  const navigateToProduct = (id: string) => router.push(`/shop/${id}`)

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)

  const placeOrder = async () => {
    setPlacing(true)
    try {
      await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.product.id,
            productName: i.product.name,
            category: i.product.category,
            qty: i.qty,
            unitPrice: i.product.price,
          })),
          deliveryAddress: "Str. Fabricii 12, Cluj-Napoca",
        }),
      })
      setCart([])
      persistCart([])
      setCartOpen(false)
      router.push("/shop/orders")
    } finally {
      setPlacing(false)
    }
  }

  if (loading) return <Skeleton />

  const featured = products.filter((p) => p.featured)

  const visible = products.filter((p) => {
    const matchesCat = category === "all" || p.category === category
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <>
      <div
        style={{
          background: "#000",
          minHeight: "100vh",
          maxWidth: 480,
          margin: "0 auto",
          padding: "52px 0 100px",
          fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
          color: "rgba(255,255,255,0.9)",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 16px",
            marginBottom: 14,
          }}
        >
          <div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.32)", marginBottom: 2 }}>PRV</p>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px" }}>Shop</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              href="/shop/wishlist"
              style={{
                width: 36,
                height: 36,
                borderRadius: 100,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.11)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconHeart />
            </Link>
            <div style={{ position: "relative", display: "inline-block" }}>
              <button
                onClick={() => setCartOpen(true)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 100,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.11)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <IconCart />
              </button>
              {cartCount > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -3,
                    width: 17,
                    height: 17,
                    borderRadius: 100,
                    background: "#ff3b30",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#fff",
                    border: "1.5px solid #000",
                  }}
                >
                  {cartCount}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div
          style={{
            margin: "0 16px 14px",
            height: 40,
            borderRadius: 100,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.11)",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: 8,
          }}
        >
          <IconSearch />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută produse, materiale..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "rgba(255,255,255,0.85)",
            }}
          />
        </div>

        {/* Category pills */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "0 16px 14px",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {CATS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              style={{
                padding: "6px 13px",
                borderRadius: 100,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: category === id ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.07)",
                color: category === id ? "#000" : "rgba(255,255,255,0.50)",
                border: category === id ? "none" : "1px solid rgba(255,255,255,0.11)",
              }}
            >
              <CategoryIcon cat={id} size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Promo banner — shown only when not filtering */}
        {category === "all" && !search && (
          <div
            style={{
              margin: "0 16px 20px",
              borderRadius: 20,
              padding: "18px 20px 20px",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 100%)",
              border: "1px solid rgba(255,255,255,0.14)",
              position: "relative",
              overflow: "hidden",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "3px 9px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
                background: "rgba(255,159,10,0.18)",
                color: "rgba(255,159,10,0.95)",
                marginBottom: 8,
              }}
            >
              Ofertă Iun 2026
            </span>
            <p
              style={{
                fontSize: 21,
                fontWeight: 700,
                letterSpacing: "-0.4px",
                lineHeight: 1.2,
                marginBottom: 4,
              }}
            >
              Materiale sanitare
              <br />
              <span style={{ color: "rgba(255,69,58,0.9)" }}>−20%</span> reducere
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
              Țevi, fitinguri, robineți Grohe
            </p>
            <button
              onClick={() => setCategory("sanitare")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                marginTop: 14,
                padding: "8px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.92)",
                color: "#000",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
              }}
            >
              Vezi oferta
              <IconArrow />
            </button>
          </div>
        )}

        {/* Featured */}
        {category === "all" && !search && featured.length > 0 && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0 16px",
                marginBottom: 12,
              }}
            >
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: "-0.3px",
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                Recomandate
              </h2>
              <span
                style={{
                  fontSize: 13,
                  color: "rgba(10,132,255,0.9)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Vezi toate
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                padding: "0 16px",
                overflowX: "auto",
                scrollbarWidth: "none",
                marginBottom: 24,
              }}
            >
              {featured.map((p) => (
                <FeatCard key={p.id} product={p} onNavigate={navigateToProduct} />
              ))}
            </div>
          </>
        )}

        {/* All products grid */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 16px",
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.3px",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            {category === "all" && !search
              ? "Toate produsele"
              : (CATS.find((c) => c.id === category)?.label ?? "Rezultate")}
          </h2>
          <span
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.35)",
              fontWeight: 500,
            }}
          >
            {visible.length} produse
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: "0 16px",
          }}
        >
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={addToCart} onNavigate={navigateToProduct} />
          ))}
          {visible.length === 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "48px 24px",
                color: "rgba(255,255,255,0.30)",
                fontSize: 14,
              }}
            >
              Niciun produs găsit
            </div>
          )}
        </div>
      </div>

      {/* Cart FAB */}
      <div
        style={{
          position: "fixed",
          bottom: 28,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 100,
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 50,
        }}
        onClick={() => setCartOpen(true)}
      >
        <IconCartDark />
        {cartCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 18,
              height: 18,
              borderRadius: 100,
              background: "#ff3b30",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {cartCount}
          </div>
        )}
      </div>

      {/* Cart sheet */}
      {cartOpen && (
        <CartSheet
          items={cart}
          onClose={() => setCartOpen(false)}
          onQtyChange={changeQty}
          onPlaceOrder={placeOrder}
          placing={placing}
        />
      )}
    </>
  )
}
