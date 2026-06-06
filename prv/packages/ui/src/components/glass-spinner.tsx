"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type SpinnerSize = "sm" | "md" | "lg"
export type SpinnerVariant = "ring" | "dots"

export interface GlassSpinnerProps {
  size?: SpinnerSize
  variant?: SpinnerVariant
  /** Use the accent color for the active stroke/dots. */
  accent?: boolean
  /** Text shown beside the spinner; renders the inline glass pill form. */
  label?: string
  className?: string
  style?: React.CSSProperties
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RING: Record<SpinnerSize, { d: number; b: number }> = {
  sm: { d: 18, b: 2 },
  md: { d: 28, b: 3 },
  lg: { d: 44, b: 4 },
}
const DOT: Record<SpinnerSize, number> = { sm: 6, md: 9, lg: 13 }

const KEYFRAMES = `
@keyframes prvSpin{to{transform:rotate(360deg)}}
@keyframes prvBounce{0%,80%,100%{transform:scale(0.5);opacity:.4}40%{transform:scale(1);opacity:1}}
`

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassSpinner({
  size = "md",
  variant = "ring",
  accent = false,
  label,
  className,
  style,
}: GlassSpinnerProps) {
  const activeColor = accent ? "var(--prv-accent, rgba(10,132,255,0.9))" : "var(--prv-text-1)"

  const spinner =
    variant === "dots" ? (
      <span
        role="status"
        aria-label={label ?? "Loading"}
        style={{ display: "inline-flex", gap: 6 }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: DOT[size],
              height: DOT[size],
              borderRadius: "50%",
              background: activeColor,
              animation: "prvBounce 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </span>
    ) : (
      <span
        role="status"
        aria-label={label ?? "Loading"}
        style={{
          display: "inline-block",
          width: RING[size].d,
          height: RING[size].d,
          borderRadius: "50%",
          border: `${RING[size].b}px solid var(--prv-g3)`,
          borderTopColor: activeColor,
          animation: "prvSpin 0.8s linear infinite",
        }}
      />
    )

  // Inline pill form when a label is provided.
  if (label) {
    return (
      <span
        className={clsx(className)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 18px",
          borderRadius: 12,
          background: "var(--prv-g2)",
          border: "1px solid var(--prv-border-subtle)",
          fontSize: 13,
          color: "var(--prv-text-2)",
          ...style,
        }}
      >
        <style>{KEYFRAMES}</style>
        {spinner}
        {label}
      </span>
    )
  }

  return (
    <span className={clsx(className)} style={{ display: "inline-flex", ...style }}>
      <style>{KEYFRAMES}</style>
      {spinner}
    </span>
  )
}
