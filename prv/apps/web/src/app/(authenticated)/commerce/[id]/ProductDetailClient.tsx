"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import type { ProductDetail } from "@/app/api/shop/products/[id]/route"
import type { Product, ProductCategory } from "@/app/api/shop/products/route"

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconBack() {
  return (
    <svg
      width="9"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function IconCart() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
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

function IconCheck() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconMinus() {
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
      <path d="M5 12h14" />
    </svg>
  )
}

function IconPlus() {
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
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function CategoryIcon({ cat, size = 48 }: { cat: ProductCategory; size?: number }) {
  const s = { width: size, height: size }
  const base = {
    fill: "none" as const,
    stroke: "rgba(255,255,255,0.45)",
    strokeWidth: 1.4,
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
  // scule
  return (
    <svg {...s} viewBox="0 0 24 24" {...base}>
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

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

const CAT_LABELS: Record<string, string> = {
  tamplarie: "Carpentry",
  sanitare: "Sanitare",
  electrice: "Electrice",
  pardoseli: "Pardoseli",
  vopsele: "Vopsele",
  scule: "Scule",
}

function fmtPrice(price: number, unit: string) {
  const p = `€${price.toLocaleString("en-US")}`
  if (unit === "m²" || unit === "sac") return `${p}/${unit}`
  return p
}

// ── Cart helpers ──────────────────────────────────────────────────────────────

interface CartItem {
  id: string
  name: string
  price: number
  qty: number
}

const CART_KEY = "prv_shop_cart"

function readCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(sessionStorage.getItem(CART_KEY) ?? "[]")
  } catch {
    return []
  }
}

function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(CART_KEY, JSON.stringify(items))
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div
      style={{
        background: "#000",
        minHeight: "100vh",
        maxWidth: 480,
        margin: "0 auto",
        padding: "0 0 100px",
        fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          height: 280,
          background: "rgba(255,255,255,0.05)",
          marginBottom: 24,
        }}
        className="animate-pulse"
      />
      <div style={{ padding: "0 16px" }}>
        {[100, 60, 80, 40].map((w, i) => (
          <div
            key={i}
            style={{
              height: i === 0 ? 28 : 20,
              width: `${w}%`,
              background: "rgba(255,255,255,0.07)",
              borderRadius: 6,
              marginBottom: 12,
            }}
            className="animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}

// ── Related product mini card ─────────────────────────────────────────────────

function RelatedCard({ product, onClick }: { product: Product; onClick: (id: string) => void }) {
  return (
    <div
      onClick={() => onClick(product.id)}
      style={{
        flexShrink: 0,
        width: 130,
        borderRadius: 16,
        overflow: "hidden",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.11)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          height: 88,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <CategoryIcon cat={product.category} size={32} />
      </div>
      <div style={{ padding: "8px 10px 10px" }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.80)",
            lineHeight: 1.35,
            marginBottom: 4,
          }}
        >
          {product.name}
        </p>
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
          }}
        >
          {fmtPrice(product.price, product.unit)}
        </p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProductDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [qtySeeded, setQtySeeded] = useState(false)

  // Cart count is hydrated from localStorage, which only exists on the client.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCartCount(readCart().reduce((s, i) => s + i.qty, 0))
  }, [])

  const {
    data,
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ["product-detail", id],
    queryFn: () =>
      fetch(`/api/shop/products/${id}`).then((r) => {
        if (!r.ok) throw new Error("Product not found")
        return r.json() as Promise<{ product: ProductDetail; related: Product[] }>
      }),
  })
  const product = data?.product ?? null
  const related = data?.related ?? []

  // Seed the order quantity from the product's minimum once it loads.
  if (product && !qtySeeded) {
    setQtySeeded(true)
    setQty(product.minOrderQty ?? 1)
  }

  // Unknown / unavailable product id → bounce back to the shop.
  useEffect(() => {
    if (isError) router.replace("/commerce")
  }, [isError, router])

  const addToCart = () => {
    if (!product) return
    const cart = readCart()
    const existing = cart.find((i) => i.id === product.id)
    let next: CartItem[]
    if (existing) {
      next = cart.map((i) => (i.id === product.id ? { ...i, qty: i.qty + qty } : i))
    } else {
      next = [...cart, { id: product.id, name: product.name, price: product.price, qty }]
    }
    writeCart(next)
    setCartCount(next.reduce((s, i) => s + i.qty, 0))
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
  }

  if (loading) return <Skeleton />
  if (!product) return null

  const badge = product.badge ? BADGE_CONFIG[product.badge] : null
  const stockLabel =
    product.stock > 20
      ? { text: "In Stock", color: "rgba(48,209,88,0.9)", bg: "rgba(48,209,88,0.13)" }
      : product.stock > 0
        ? {
            text: `${product.stock} buc disponibile`,
            color: "rgba(255,159,10,0.9)",
            bg: "rgba(255,159,10,0.13)",
          }
        : { text: "Indisponibil", color: "rgba(255,69,58,0.9)", bg: "rgba(255,69,58,0.13)" }

  return (
    <div
      style={{
        background: "#000",
        minHeight: "100vh",
        maxWidth: 480,
        margin: "0 auto",
        fontFamily: "-apple-system, 'SF Pro Text', BlinkMacSystemFont, sans-serif",
        color: "rgba(255,255,255,0.9)",
        WebkitFontSmoothing: "antialiased",
        paddingBottom: 120,
      }}
    >
      {/* Floating nav bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: 100,
            padding: "7px 14px 7px 11px",
            color: "rgba(255,255,255,0.85)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <IconBack />
          Shop
        </button>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => router.push("/commerce")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 100,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.11)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.75)",
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

      {/* Hero / product image area */}
      <div
        style={{
          height: 260,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          position: "relative",
        }}
      >
        <CategoryIcon cat={product.category} size={80} />
        {badge && (
          <span
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              padding: "4px 10px",
              borderRadius: 7,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              background: badge.bg,
              color: badge.color,
            }}
          >
            {badge.label}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px 0" }}>
        {/* Category + SKU row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            {CAT_LABELS[product.category] ?? product.category}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(255,255,255,0.25)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.03em",
            }}
          >
            SKU: {product.sku}
          </span>
        </div>

        {/* Name */}
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.4px",
            lineHeight: 1.25,
            color: "rgba(255,255,255,0.97)",
            marginBottom: 12,
          }}
        >
          {product.name}
        </h1>

        <a
          href={`/commerce/${id}/variants`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 12,
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.6)",
            textDecoration: "none",
          }}
        >
          Manage variants ›
        </a>
        <a
          href={`/commerce/${id}/suppliers`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 12,
            marginLeft: 16,
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.6)",
            textDecoration: "none",
          }}
        >
          Sourcing ›
        </a>

        {/* Price row */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              color: "rgba(255,255,255,0.97)",
            }}
          >
            {fmtPrice(product.price, product.unit)}
          </span>
          {product.oldPrice && (
            <span
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.30)",
                textDecoration: "line-through",
                fontWeight: 400,
              }}
            >
              €{product.oldPrice}
            </span>
          )}
          {product.oldPrice && (
            <span
              style={{
                padding: "3px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: "rgba(255,69,58,0.15)",
                color: "rgba(255,69,58,0.9)",
              }}
            >
              −{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
            </span>
          )}
        </div>

        {/* Stock pill */}
        <span
          style={{
            display: "inline-block",
            padding: "5px 12px",
            borderRadius: 100,
            fontSize: 12,
            fontWeight: 600,
            background: stockLabel.bg,
            color: stockLabel.color,
            marginBottom: 20,
          }}
        >
          {stockLabel.text}
        </span>

        {/* Description */}
        <div
          style={{
            padding: "16px",
            borderRadius: 16,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            marginBottom: 16,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "rgba(255,255,255,0.30)",
              marginBottom: 8,
            }}
          >
            Descriere
          </p>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.70)",
            }}
          >
            {product.description}
          </p>
        </div>

        {/* Specs table */}
        {product.specs.length > 0 && (
          <div
            style={{
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.09)",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(255,255,255,0.06)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "rgba(255,255,255,0.30)",
                }}
              >
                Technical specifications
              </p>
            </div>
            {product.specs.map((spec, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "11px 16px",
                  borderBottom:
                    i < product.specs.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
                  background: i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.45)",
                    fontWeight: 500,
                  }}
                >
                  {spec.label}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.80)",
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {product.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 28 }}>
            {product.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "4px 10px",
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 600,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.40)",
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Related products */}
        {related.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <p
              style={{
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: "-0.3px",
                color: "rgba(255,255,255,0.95)",
                marginBottom: 12,
              }}
            >
              Produse similare
            </p>
            <div
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                scrollbarWidth: "none",
                paddingBottom: 4,
              }}
            >
              {related.map((p) => (
                <RelatedCard
                  key={p.id}
                  product={p}
                  onClick={(pid) => router.push(`/commerce/${pid}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          maxWidth: 480,
          margin: "0 auto",
          padding: "16px 16px 28px",
          background: "rgba(0,0,0,0.88)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderTop: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Qty selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setQty((q) => Math.max(product.minOrderQty, q - 1))}
              style={{
                width: 40,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.65)",
                cursor: "pointer",
                borderRight: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <IconMinus />
            </button>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "rgba(255,255,255,0.90)",
                minWidth: 36,
                textAlign: "center",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => q + 1)}
              style={{
                width: 40,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.65)",
                cursor: "pointer",
                borderLeft: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <IconPlus />
            </button>
          </div>

          {/* Add to cart button */}
          <button
            onClick={addToCart}
            disabled={product.stock === 0}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 12,
              background: added ? "rgba(48,209,88,0.15)" : "rgba(255,255,255,0.92)",
              border: added ? "1px solid rgba(48,209,88,0.40)" : "none",
              color: added ? "rgba(48,209,88,0.95)" : "#000",
              fontSize: 15,
              fontWeight: 700,
              cursor: product.stock === 0 ? "default" : "pointer",
              opacity: product.stock === 0 ? 0.4 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.25s ease, color 0.25s ease, border 0.25s ease",
            }}
          >
            {added ? (
              <>
                <IconCheck />
                Added to cart
              </>
            ) : (
              <>
                <IconCart />
                {product.stock === 0
                  ? "Indisponibil"
                  : `Add ${qty > 1 ? `× ${qty}` : ""} — ${fmtPrice(product.price * qty, product.unit)}`}
              </>
            )}
          </button>
        </div>

        {product.minOrderQty > 1 && (
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.28)",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            Min order: {product.minOrderQty} {product.unit}
          </p>
        )}
      </div>
    </div>
  )
}
