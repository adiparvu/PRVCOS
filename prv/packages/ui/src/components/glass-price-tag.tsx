"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type PriceTagSize = "sm" | "md" | "lg"

export interface GlassPriceTagProps {
  /** Current amount. Number is formatted with thousands separators; string is shown as-is. */
  amount: number | string
  /** Currency symbol/code shown before the amount (e.g. "€", "RON"). */
  currency?: string
  /** Original price, shown struck-through. Triggers the save badge when numeric. */
  wasPrice?: number | string
  /** Render "Free" instead of an amount. */
  free?: boolean
  size?: PriceTagSize
  /** Show the "Save N%" badge when wasPrice + amount are both numeric. Default true. */
  showSave?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Sizes ─────────────────────────────────────────────────────────────────────

const AMT_PX: Record<PriceTagSize, number> = { sm: 18, md: 28, lg: 36 }
const CUR_PX: Record<PriceTagSize, number> = { sm: 12, md: 14, lg: 16 }

function format(v: number | string): string {
  return typeof v === "number" ? v.toLocaleString() : v
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassPriceTag({
  amount,
  currency = "€",
  wasPrice,
  free = false,
  size = "md",
  showSave = true,
  className,
  style,
}: GlassPriceTagProps) {
  const amtPx = AMT_PX[size]
  const curPx = CUR_PX[size]

  const savePct =
    showSave && typeof amount === "number" && typeof wasPrice === "number" && wasPrice > amount
      ? Math.round((1 - amount / wasPrice) * 100)
      : null

  if (free) {
    return (
      <span
        className={clsx(className)}
        style={{ display: "inline-flex", alignItems: "baseline", ...style }}
      >
        <span
          style={{
            fontSize: amtPx * 0.72,
            fontWeight: 700,
            color: "var(--prv-green, rgba(48,209,88,0.95))",
          }}
        >
          Free
        </span>
      </span>
    )
  }

  return (
    <span
      className={clsx(className)}
      style={{ display: "inline-flex", alignItems: "baseline", gap: 8, ...style }}
    >
      {currency && (
        <span
          style={{
            fontSize: curPx,
            color: "var(--prv-text-3)",
            fontWeight: 600,
            alignSelf: "flex-start",
            marginTop: 3,
          }}
        >
          {currency}
        </span>
      )}
      <span
        style={{
          fontSize: amtPx,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
          color: "var(--prv-text-1)",
        }}
      >
        {format(amount)}
      </span>
      {wasPrice !== undefined && (
        <span
          style={{
            fontSize: curPx,
            color: "var(--prv-text-4)",
            textDecoration: "line-through",
          }}
        >
          {currency}
          {format(wasPrice)}
        </span>
      )}
      {savePct !== null && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 6,
            background: "rgba(48,209,88,0.14)",
            color: "var(--prv-green, rgba(48,209,88,0.95))",
          }}
        >
          Save {savePct}%
        </span>
      )}
    </span>
  )
}
