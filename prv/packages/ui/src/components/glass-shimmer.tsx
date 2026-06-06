"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ShimmerVariant = "text" | "circle" | "rect" | "card" | "list"

export interface GlassShimmerProps {
  variant?: ShimmerVariant
  /** Width (number → px, string → as-is). */
  width?: number | string
  /** Height (number → px, string → as-is). */
  height?: number | string
  /** Number of text lines (variant="text") or rows (variant="list"). Default 3. */
  lines?: number
  className?: string
  style?: React.CSSProperties
}

// ── Shimmer keyframes (shared) ─────────────────────────────────────────────────

const KEYFRAMES = `@keyframes prvShimmer{100%{transform:translateX(100%)}}`

// ── Primitive ─────────────────────────────────────────────────────────────────

function Bar({
  width,
  height,
  radius,
  style,
}: {
  width?: number | string
  height?: number | string
  radius?: number | string
  style?: React.CSSProperties
}) {
  return (
    <span
      style={{
        position: "relative",
        overflow: "hidden",
        display: "block",
        background: "var(--prv-g2)",
        borderRadius: radius ?? 8,
        width: width ?? "100%",
        height: height ?? 11,
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          transform: "translateX(-100%)",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          animation: "prvShimmer 1.4s infinite",
        }}
      />
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassShimmer({
  variant = "text",
  width,
  height,
  lines = 3,
  className,
  style,
}: GlassShimmerProps) {
  const wrap = (children: React.ReactNode) => (
    <div
      className={clsx(className)}
      role="status"
      aria-label="Loading"
      aria-busy="true"
      style={style}
    >
      <style>{KEYFRAMES}</style>
      {children}
    </div>
  )

  if (variant === "circle") {
    const d = width ?? height ?? 44
    return wrap(<Bar width={d} height={d} radius="50%" />)
  }

  if (variant === "rect") {
    return wrap(<Bar width={width} height={height ?? 120} radius={12} />)
  }

  if (variant === "text") {
    return wrap(
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <Bar
            key={i}
            width={width ?? (i === lines - 1 ? "70%" : i === 0 ? "60%" : "100%")}
            height={height ?? 11}
          />
        ))}
      </div>
    )
  }

  if (variant === "list") {
    return wrap(
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Bar width={36} height={36} radius={10} />
            <div style={{ flex: 1 }}>
              <Bar width="70%" height={11} style={{ marginBottom: 6 }} />
              <Bar width="45%" height={11} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // card
  return wrap(
    <div
      style={{
        width: width ?? 280,
        padding: 16,
        borderRadius: 16,
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <Bar width={44} height={44} radius="50%" />
        <div style={{ flex: 1 }}>
          <Bar width="60%" height={11} style={{ marginBottom: 7 }} />
          <Bar width="40%" height={11} />
        </div>
      </div>
      <Bar width="100%" height={120} radius={12} style={{ marginBottom: 14 }} />
      <Bar width="100%" height={11} style={{ marginBottom: 7 }} />
      <Bar width="90%" height={11} style={{ marginBottom: 7 }} />
      <Bar width="70%" height={11} />
    </div>
  )
}
