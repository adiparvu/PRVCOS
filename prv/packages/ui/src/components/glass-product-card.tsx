"use client"

import React, { useState } from "react"
import { clsx } from "clsx"
import { GlassPriceTag } from "./glass-price-tag"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductBadge {
  label: string
  variant?: "sale" | "new"
}

export interface GlassProductCardProps {
  name: string
  image: string
  category?: string
  price: number | string
  wasPrice?: number | string
  currency?: string
  /** Top-left badge. */
  badge?: ProductBadge
  /** Star rating value (0–5). */
  rating?: number
  /** Review count shown beside the rating. */
  reviews?: number
  /** Controlled favorite state. */
  favorite?: boolean
  onToggleFavorite?: (next: boolean) => void
  outOfStock?: boolean
  onAdd?: () => void
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassProductCard({
  name,
  image,
  category,
  price,
  wasPrice,
  currency = "€",
  badge,
  rating,
  reviews,
  favorite,
  onToggleFavorite,
  outOfStock = false,
  onAdd,
  onClick,
  className,
  style,
}: GlassProductCardProps) {
  const isControlledFav = favorite !== undefined
  const [internalFav, setInternalFav] = useState(false)
  const fav = isControlledFav ? favorite : internalFav

  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !fav
    if (!isControlledFav) setInternalFav(next)
    onToggleFavorite?.(next)
  }

  return (
    <div
      className={clsx("relative", className)}
      onClick={onClick}
      style={{
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        position: "relative",
        cursor: onClick ? "pointer" : undefined,
        transition: "transform 200ms, box-shadow 200ms",
        ...style,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = "translateY(-3px)"
        el.style.boxShadow = "0 14px 36px rgba(0,0,0,0.45)"
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = "translateY(0)"
        el.style.boxShadow = "none"
      }}
    >
      {/* Media */}
      <div style={{ position: "relative", aspectRatio: "1" }}>
        <img src={image} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />

        {badge && (
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 6,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "#fff",
              background:
                badge.variant === "sale"
                  ? "var(--prv-red, rgba(255,69,58,0.95))"
                  : "var(--prv-accent, rgba(10,132,255,0.9))",
            }}
          >
            {badge.label}
          </span>
        )}

        <button
          type="button"
          aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={fav}
          onClick={toggleFav}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "rgba(22,22,22,0.55)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid var(--prv-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: fav ? "var(--prv-red, rgba(255,69,58,0.95))" : "#fff",
            cursor: "pointer",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill={fav ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {outOfStock && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            Out of stock
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "13px 14px 15px" }}>
        {category && <div style={{ fontSize: 11, color: "var(--prv-text-3)" }}>{category}</div>}
        <div style={{ fontSize: 14, fontWeight: 600, margin: "3px 0 4px" }}>{name}</div>

        {rating !== undefined && (
          <div
            style={{
              fontSize: 11,
              color: "var(--prv-text-3)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginBottom: 10,
            }}
          >
            <span style={{ color: "rgba(255,204,0,0.95)" }}>★</span>
            {rating.toFixed(1)}
            {reviews !== undefined && <> · {reviews}</>}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <GlassPriceTag amount={price} wasPrice={wasPrice} currency={currency} size="sm" />
          <button
            type="button"
            aria-label="Add to cart"
            disabled={outOfStock}
            onClick={(e) => {
              e.stopPropagation()
              onAdd?.()
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: "var(--prv-text-1)",
              border: "none",
              color: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: outOfStock ? "not-allowed" : "pointer",
              opacity: outOfStock ? 0.35 : 1,
              transition: "transform 150ms",
              flexShrink: 0,
            }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
