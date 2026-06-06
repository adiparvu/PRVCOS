"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GaugeThresholds {
  /** value >= good → green. Default 80. */
  good?: number
  /** value >= warn → amber (below good). Default 40. */
  warn?: number
}

export interface GlassGaugeProps {
  value: number
  /** Max value. Default 100. */
  max?: number
  /** Diameter in px. Default 120. */
  size?: number
  /** Auto color thresholds (percent of max). Ignored if `color` is set. */
  thresholds?: GaugeThresholds
  /** Explicit arc color override. */
  color?: string
  /** Center caption under the value. */
  label?: string
  /** Unit suffix shown after the value. Default "%". */
  unit?: string
  /** Animate the arc on value change. Default true. */
  animated?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Colors ────────────────────────────────────────────────────────────────────

const GREEN = "var(--prv-green, rgba(48,209,88,0.95))"
const AMBER = "var(--prv-amber, rgba(255,159,10,0.95))"
const RED = "var(--prv-red, rgba(255,69,58,0.95))"

function autoColor(pct: number, t: GaugeThresholds): string {
  const good = t.good ?? 80
  const warn = t.warn ?? 40
  if (pct >= good) return GREEN
  if (pct >= warn) return AMBER
  return RED
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassGauge({
  value,
  max = 100,
  size = 120,
  thresholds = {},
  color,
  label,
  unit = "%",
  animated = true,
  className,
  style,
}: GlassGaugeProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const arcColor = color ?? autoColor(pct, thresholds)

  const stroke = 10
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const sweep = 0.75 // 270° arc
  const arcLen = circumference * sweep
  const offset = arcLen * (1 - pct / 100)

  return (
    <div
      className={clsx(className)}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      style={{ position: "relative", width: size, height: size, ...style }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(135deg)" }} aria-hidden="true">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--prv-g2)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circumference}`}
        />
        {/* Value arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={arcColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circumference}`}
          strokeDashoffset={offset}
          style={{
            transition: animated
              ? "stroke-dashoffset 900ms cubic-bezier(0.34,1.56,0.64,1), stroke 300ms"
              : undefined,
          }}
        />
      </svg>

      {/* Center label */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: size * 0.22,
            fontWeight: 700,
            color: "var(--prv-text-1)",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {Math.round(value)}
          {unit && <span style={{ fontSize: size * 0.12 }}>{unit}</span>}
        </div>
        {label && (
          <div
            style={{
              fontSize: 11,
              color: "var(--prv-text-3)",
              marginTop: 2,
            }}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  )
}
