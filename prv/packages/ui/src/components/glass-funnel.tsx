"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FunnelStage {
  label: string
  value: number
  /** Bar color. Falls back to the default palette by index. */
  color?: string
}

export interface GlassFunnelProps {
  stages: FunnelStage[]
  /** Show the per-stage drop-off line. Default true. */
  showDropoff?: boolean
  /** Format the numeric value. Default toLocaleString(). */
  formatValue?: (value: number) => string
  /** Animate bar widths. Default true. */
  animated?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Default palette ────────────────────────────────────────────────────────────

const PALETTE = ["#0A84FF", "#5E5CE6", "#30D158", "#FF9F0A", "#BF5AF2", "#FF375F"]

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassFunnel({
  stages,
  showDropoff = true,
  formatValue = (v) => v.toLocaleString(),
  animated = true,
  className,
  style,
}: GlassFunnelProps) {
  const top = stages[0]?.value ?? 0

  return (
    <div
      className={clsx(className)}
      style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}
    >
      {stages.map((stage, i) => {
        const pctOfTop = top > 0 ? (stage.value / top) * 100 : 0
        const prev = stages[i - 1]
        const dropoff = i > 0 && prev && prev.value > 0 ? 100 - (stage.value / prev.value) * 100 : 0
        const color = stage.color ?? PALETTE[i % PALETTE.length]!

        return (
          <div key={stage.label}>
            <div
              style={{
                height: 46,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                width: `${Math.max(pctOfTop, 6)}%`,
                minWidth: "fit-content",
                background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                transition: animated ? "width 700ms cubic-bezier(0.34,1.56,0.64,1)" : undefined,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {stage.label} · {formatValue(stage.value)}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
                fontSize: 11,
                color: "var(--prv-text-3)",
              }}
            >
              <span>{pctOfTop.toFixed(1)}% of top</span>
              {showDropoff && i > 0 ? (
                <span style={{ color: "var(--prv-red, rgba(255,69,58,0.95))" }}>
                  ▼ {dropoff.toFixed(1)}% drop-off
                </span>
              ) : (
                <span>—</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
