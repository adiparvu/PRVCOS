"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type TypingSize = "sm" | "md"

export interface GlassTypingIndicatorProps {
  /** Optional text shown beside the dots (outside the bubble). */
  label?: string
  /** Wrap the dots in a chat bubble (tail-corner). Default true. */
  bubble?: boolean
  size?: TypingSize
  className?: string
  style?: React.CSSProperties
}

// ── Keyframes ─────────────────────────────────────────────────────────────────

const KEYFRAMES = `@keyframes prvTyping{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}`

const DOT_PX: Record<TypingSize, number> = { sm: 6, md: 8 }

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassTypingIndicator({
  label,
  bubble = true,
  size = "md",
  className,
  style,
}: GlassTypingIndicatorProps) {
  const px = DOT_PX[size]

  const dots = (
    <span
      role="status"
      aria-label={label ?? "Typing"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        ...(bubble
          ? {
              padding: size === "sm" ? "10px 13px" : "13px 16px",
              background: "var(--prv-g2)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 18,
              borderTopLeftRadius: 6,
            }
          : {}),
      }}
    >
      <style>{KEYFRAMES}</style>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: px,
            height: px,
            borderRadius: "50%",
            background: "var(--prv-text-3)",
            animation: "prvTyping 1.3s ease-in-out infinite",
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </span>
  )

  if (label) {
    return (
      <span
        className={clsx(className)}
        style={{ display: "inline-flex", alignItems: "center", gap: 12, ...style }}
      >
        {dots}
        <span style={{ fontSize: 13, color: "var(--prv-text-3)" }}>{label}</span>
      </span>
    )
  }

  return (
    <span className={clsx(className)} style={{ display: "inline-flex", ...style }}>
      {dots}
    </span>
  )
}
