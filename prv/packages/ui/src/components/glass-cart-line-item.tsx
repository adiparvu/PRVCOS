"use client"

import React from "react"
import { clsx } from "clsx"
import { GlassQuantityStepper } from "./glass-quantity-stepper"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassCartLineItemProps {
  name: string
  image: string
  /** Variant line (e.g. "Blue · 2 batteries"). */
  variant?: string
  /** Pre-formatted line total (e.g. "€298"). */
  price: React.ReactNode
  quantity: number
  onQuantityChange: (quantity: number) => void
  onRemove?: () => void
  min?: number
  max?: number
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassCartLineItem({
  name,
  image,
  variant,
  price,
  quantity,
  onQuantityChange,
  onRemove,
  min = 1,
  max = 99,
  className,
  style,
}: GlassCartLineItemProps) {
  return (
    <div
      className={clsx(className)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 0",
        ...style,
      }}
    >
      <img
        src={image}
        alt={name}
        style={{
          width: 60,
          height: 60,
          borderRadius: 12,
          flexShrink: 0,
          objectFit: "cover",
          border: "1px solid var(--prv-border-subtle)",
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)" }}>{name}</div>
        {variant && (
          <div style={{ fontSize: 12, color: "var(--prv-text-3)", marginTop: 2 }}>{variant}</div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: "var(--prv-text-1)",
          }}
        >
          {price}
        </div>
        <GlassQuantityStepper
          value={quantity}
          onChange={onQuantityChange}
          onRemove={onRemove}
          min={min}
          max={max}
          removeAtMin={!!onRemove}
        />
      </div>
    </div>
  )
}
