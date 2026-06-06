"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassAspectRatioProps {
  /** Width/height ratio. Number (e.g. 16/9) or "w:h" string (e.g. "16:9"). */
  ratio?: number | string
  children: React.ReactNode
  /** Corner radius (px). Default 14. */
  radius?: number
  /** Clip children to the rounded box. Default true. */
  clip?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Helper ────────────────────────────────────────────────────────────────────

function resolveRatio(ratio: number | string): number {
  if (typeof ratio === "number") return ratio > 0 ? ratio : 1
  const [w, h] = ratio.split(/[:/]/).map(Number)
  if (w && h && h !== 0) return w / h
  return 1
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassAspectRatio({
  ratio = 16 / 9,
  children,
  radius = 14,
  clip = true,
  className,
  style,
}: GlassAspectRatioProps) {
  const aspect = resolveRatio(ratio)

  return (
    <div
      className={clsx(className)}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: String(aspect),
        borderRadius: radius,
        overflow: clip ? "hidden" : undefined,
        ...style,
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  )
}
