"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { WishlistItem } from "@/app/api/shop/wishlist/route"

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })
}

const CART_KEY = "prv_shop_cart"

function addToSessionCart(item: { id: string; name: string; price: number }) {
  if (typeof window === "undefined") return
  try {
    const raw = sessionStorage.getItem(CART_KEY)
    const cart: Array<{ id: string; name: string; price: number; qty: number }> = raw
      ? JSON.parse(raw)
      : []
    const existing = cart.find((i) => i.id === item.id)
    const next = existing
      ? cart.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i))
      : [...cart, { ...item, qty: 1 }]
    sessionStorage.setItem(CART_KEY, JSON.stringify(next))
  } catch {}
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconChevronLeft() {
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

function IconChevronRight() {
  return (
    <svg
      width="7"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function IconCart() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

function IconHeart() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div
        style={{
          height: 32,
          width: 180,
          background: "var(--prv-g2)",
          borderRadius: 8,
          marginBottom: 20,
        }}
        className="animate-pulse"
      />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 80,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 16,
            marginBottom: 8,
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ── Wishlist item card ────────────────────────────────────────────────────────

function WishlistCard({
  item,
  onRemove,
  onAddToCart,
  onNavigate,
}: {
  item: WishlistItem
  onRemove: (productId: string) => void
  onAddToCart: (item: WishlistItem) => void
  onNavigate: (productId: string) => void
}) {
  const [removing, setRemoving] = useState(false)
  const [added, setAdded] = useState(false)

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setRemoving(true)
    try {
      await fetch("/api/shop/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: item.productId }),
      })
      onRemove(item.productId)
    } finally {
      setRemoving(false)
    }
  }

  const handleCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToCart(item)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div
      onClick={() => onNavigate(item.productId)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 16,
        marginBottom: 8,
        cursor: "pointer",
        opacity: removing ? 0.5 : 1,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "rgba(255,255,255,0.92)",
            marginBottom: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.productName}
        </p>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.32)" }}>
          {item.productSku ? `${item.productSku} · ` : ""}
          {CAT_LABELS[item.category ?? ""] ?? item.category} · Added {fmtDate(item.addedAt)}
        </p>
        {item.notes && (
          <p
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.40)",
              marginTop: 3,
              fontStyle: "italic",
            }}
          >
            {item.notes}
          </p>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <p
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "rgba(255,255,255,0.90)",
            letterSpacing: "-0.3px",
          }}
        >
          {fmtPrice(item.price, item.unit)}
        </p>
        <button
          onClick={handleCart}
          style={{
            width: 32,
            height: 32,
            borderRadius: 100,
            background: added ? "rgba(90,255,160,0.15)" : "rgba(255,255,255,0.08)",
            border: added ? "1px solid rgba(90,255,160,0.30)" : "1px solid rgba(255,255,255,0.12)",
            color: added ? "rgba(90,255,160,0.9)" : "rgba(255,255,255,0.60)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconCart />
        </button>
        <button
          onClick={handleRemove}
          disabled={removing}
          style={{
            width: 32,
            height: 32,
            borderRadius: 100,
            background: "rgba(255,69,58,0.08)",
            border: "1px solid rgba(255,69,58,0.18)",
            color: "rgba(255,69,58,0.70)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconTrash />
        </button>
        <span style={{ color: "rgba(255,255,255,0.18)" }}>
          <IconChevronRight />
        </span>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WishlistClient() {
  const router = useRouter()
  const [cartFlash, setCartFlash] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading: loading } = useQuery({
    queryKey: ["shop-wishlist"],
    queryFn: () =>
      fetch("/api/shop/wishlist").then((r) => {
        if (!r.ok) throw new Error("Failed to load wishlist")
        return r.json() as Promise<{ items: WishlistItem[] }>
      }),
  })
  const items = data?.items ?? []

  const handleRemove = (productId: string) => {
    queryClient.setQueryData<{ items: WishlistItem[] }>(["shop-wishlist"], (prev) =>
      prev ? { items: prev.items.filter((i) => i.productId !== productId) } : prev
    )
  }

  const handleAddToCart = (item: WishlistItem) => {
    addToSessionCart({ id: item.productId, name: item.productName, price: item.price })
    setCartFlash(true)
    setTimeout(() => setCartFlash(false), 2000)
  }

  const addAllToCart = () => {
    items.forEach((item) =>
      addToSessionCart({ id: item.productId, name: item.productName, price: item.price })
    )
    setCartFlash(true)
    setTimeout(() => setCartFlash(false), 2000)
  }

  if (loading) return <Skeleton />

  const totalValue = items.reduce((s, i) => s + i.price, 0)

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Link
          href="/shop"
          style={{
            display: "flex",
            alignItems: "center",
            color: "rgba(255,255,255,0.40)",
            textDecoration: "none",
            marginRight: 2,
          }}
        >
          <IconChevronLeft />
        </Link>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "rgba(255,255,255,0.95)",
            flex: 1,
          }}
        >
          Wishlist
        </h1>
        {items.length > 0 && (
          <button
            onClick={addAllToCart}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: cartFlash ? "rgba(90,255,160,0.9)" : "rgba(255,255,255,0.60)",
              padding: "6px 12px",
              borderRadius: 10,
              background: cartFlash ? "rgba(90,255,160,0.10)" : "rgba(255,255,255,0.07)",
              border: cartFlash
                ? "1px solid rgba(90,255,160,0.25)"
                : "1px solid rgba(255,255,255,0.10)",
              cursor: "pointer",
            }}
          >
            <IconCart /> {cartFlash ? "Added!" : "Add all"}
          </button>
        )}
      </div>

      {/* Summary strip */}
      {items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 16,
              padding: "10px 14px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)",
              }}
            />
            <p
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "rgba(255,255,255,0.95)",
                letterSpacing: "-0.4px",
              }}
            >
              {items.length}
            </p>
            <p
              style={{
                fontSize: 9,
                fontWeight: 500,
                color: "rgba(255,255,255,0.32)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginTop: 2,
              }}
            >
              {items.length === 1 ? "produs salvat" : "produse salvate"}
            </p>
          </div>
          <div
            style={{
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 16,
              padding: "10px 14px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)",
              }}
            />
            <p style={{ fontSize: 18, fontWeight: 700, color: "#5affa0", letterSpacing: "-0.4px" }}>
              €{totalValue.toLocaleString("en-US")}
            </p>
            <p
              style={{
                fontSize: 9,
                fontWeight: 500,
                color: "rgba(255,255,255,0.32)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginTop: 2,
              }}
            >
              estimated value
            </p>
          </div>
        </div>
      )}

      {/* Items */}
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "56px 24px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <IconHeart />
          </div>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "rgba(255,255,255,0.35)",
              marginBottom: 8,
            }}
          >
            Wishlist is empty
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.22)", marginBottom: 24 }}>
            Save products you like for later.
          </p>
          <Link
            href="/shop"
            style={{
              display: "inline-block",
              padding: "10px 22px",
              borderRadius: 100,
              background: "rgba(255,255,255,0.09)",
              border: "1px solid rgba(255,255,255,0.14)",
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,0.70)",
              textDecoration: "none",
            }}
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 10,
            }}
          >
            Produse salvate
          </p>
          {items.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onRemove={handleRemove}
              onAddToCart={handleAddToCart}
              onNavigate={(id) => router.push(`/shop/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
