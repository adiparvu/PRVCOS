"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type DividerOrientation = "horizontal" | "vertical"
export type DividerVariant = "solid" | "dashed"

export interface GlassDividerProps {
  orientation?: DividerOrientation
  variant?: DividerVariant
  /** Centered label (horizontal only). */
  label?: React.ReactNode
  /** Margin along the main axis (px). */
  spacing?: number
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassDivider({
  orientation = "horizontal",
  variant = "solid",
  label,
  spacing,
  className,
  style,
}: GlassDividerProps) {
  // Vertical
  if (orientation === "vertical") {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={clsx(className)}
        style={{
          display: "inline-block",
          alignSelf: "stretch",
          width: variant === "dashed" ? 0 : 1,
          borderLeft: variant === "dashed" ? "1px dashed var(--prv-border)" : undefined,
          background: variant === "dashed" ? "none" : "var(--prv-border-subtle)",
          margin: spacing != null ? `0 ${spacing}px` : undefined,
          ...style,
        }}
      />
    )
  }

  // Horizontal with label
  if (label != null) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={clsx(className)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: "var(--prv-text-3)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          margin: spacing != null ? `${spacing}px 0` : undefined,
          ...style,
        }}
      >
        <span
          aria-hidden="true"
          style={{ flex: 1, height: 1, background: "var(--prv-border-subtle)" }}
        />
        {label}
        <span
          aria-hidden="true"
          style={{ flex: 1, height: 1, background: "var(--prv-border-subtle)" }}
        />
      </div>
    )
  }

  // Plain horizontal
  return (
    <hr
      className={clsx(className)}
      style={{
        border: "none",
        height: variant === "dashed" ? 0 : 1,
        borderTop: variant === "dashed" ? "1px dashed var(--prv-border)" : undefined,
        background: variant === "dashed" ? "none" : "var(--prv-border-subtle)",
        margin: spacing != null ? `${spacing}px 0` : 0,
        ...style,
      }}
    />
  )
}
