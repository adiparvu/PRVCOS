"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeatureItem {
  icon?: React.ReactNode
  title: string
  description: React.ReactNode
}

export interface GlassFeatureGridProps {
  features: FeatureItem[]
  /** Column count at full width. Default 3. */
  columns?: number
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassFeatureGrid({
  features,
  columns = 3,
  className,
  style,
}: GlassFeatureGridProps) {
  return (
    <div
      className={clsx(className)}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 16,
        ...style,
      }}
    >
      {features.map((f, i) => (
        <div
          key={i}
          className="relative"
          style={{
            padding: 22,
            borderRadius: 16,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            position: "relative",
            transition: "transform 200ms, background 200ms",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement
            el.style.transform = "translateY(-3px)"
            el.style.background = "var(--prv-g2)"
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement
            el.style.transform = "translateY(0)"
            el.style.background = "var(--prv-g1)"
          }}
        >
          {/* Top specular edge */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "0 0 auto",
              height: 1,
              background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
              pointerEvents: "none",
            }}
          />

          {f.icon && (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: "var(--prv-g2)",
                border: "1px solid var(--prv-border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--prv-accent, rgba(10,132,255,0.9))",
                marginBottom: 14,
              }}
            >
              {f.icon}
            </div>
          )}

          <div
            style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: "var(--prv-text-1)" }}
          >
            {f.title}
          </div>
          <div style={{ fontSize: 13, color: "var(--prv-text-3)", lineHeight: 1.55 }}>
            {f.description}
          </div>
        </div>
      ))}
    </div>
  )
}
