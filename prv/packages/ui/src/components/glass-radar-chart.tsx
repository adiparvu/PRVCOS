"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RadarSeries {
  label?: string
  /** One value per axis, in axis order. */
  values: number[]
  /** Base color as "rgba(r,g,b" (no trailing alpha/paren) or any CSS color. */
  color?: string
}

export interface GlassRadarChartProps {
  /** Axis labels, in order. */
  axes: string[]
  series: RadarSeries[]
  /** Max value for the outer ring. Default 1. */
  max?: number
  /** Number of concentric grid rings. Default 4. */
  levels?: number
  /** Diameter in px. Default 320. */
  size?: number
  /** Show axis labels. Default true. */
  showLabels?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Default palette (rgba prefix form) ─────────────────────────────────────────

const PALETTE = ["rgba(10,132,255", "rgba(48,209,88", "rgba(191,90,242", "rgba(255,159,10"]

/** Build a fill/stroke pair from a base color. */
function colors(base: string): { fill: string; stroke: string } {
  if (base.startsWith("rgba(") || base.startsWith("rgb(")) {
    const prefix = base.replace(/^rgb\(/, "rgba(").replace(/\)$/, "")
    // prefix now like "rgba(10,132,255" possibly with extra commas; normalize to 3 parts
    const nums = prefix
      .replace(/^rgba?\(/, "")
      .split(",")
      .slice(0, 3)
      .join(",")
    return { fill: `rgba(${nums},0.15)`, stroke: `rgba(${nums},0.9)` }
  }
  return { fill: base, stroke: base }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassRadarChart({
  axes,
  series,
  max = 1,
  levels = 4,
  size = 320,
  showLabels = true,
  className,
  style,
}: GlassRadarChartProps) {
  const cx = size / 2
  const cy = size / 2 - 10
  const R = size * 0.34
  const A = axes.length

  const angle = (i: number) => -Math.PI / 2 + (i / A) * 2 * Math.PI
  const point = (i: number, r: number): [number, number] => [
    cx + Math.cos(angle(i)) * R * r,
    cy + Math.sin(angle(i)) * R * r,
  ]
  const poly = (ratios: number[]) =>
    ratios
      .map((r, i) =>
        point(i, r)
          .map((n) => n.toFixed(1))
          .join(",")
      )
      .join(" ")

  return (
    <svg
      className={clsx(className)}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Radar chart"
      style={style}
    >
      {/* Grid rings */}
      {Array.from({ length: levels }, (_, l) => {
        const r = (l + 1) / levels
        return (
          <polygon
            key={`ring-${l}`}
            points={poly(axes.map(() => r))}
            fill="none"
            stroke="var(--prv-border-subtle)"
            strokeWidth={1}
          />
        )
      })}

      {/* Spokes + labels */}
      {axes.map((ax, i) => {
        const [x, y] = point(i, 1)
        const [lx, ly] = point(i, 1.18)
        return (
          <g key={`axis-${i}`}>
            <line
              x1={cx}
              y1={cy}
              x2={x.toFixed(1)}
              y2={y.toFixed(1)}
              stroke="var(--prv-border-subtle)"
              strokeWidth={1}
            />
            {showLabels && (
              <text
                x={lx.toFixed(1)}
                y={ly.toFixed(1)}
                fill="var(--prv-text-3)"
                fontSize={11}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {ax}
              </text>
            )}
          </g>
        )
      })}

      {/* Series */}
      {series.map((s, si) => {
        const base = s.color ?? PALETTE[si % PALETTE.length]!
        const { fill, stroke } = colors(base)
        const ratios = s.values.map((v) => Math.max(0, Math.min(1, v / max)))
        return (
          <g key={`series-${si}`}>
            <polygon points={poly(ratios)} fill={fill} stroke={stroke} strokeWidth={2} />
            {ratios.map((r, i) => {
              const [x, y] = point(i, r)
              return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={3} fill={stroke} />
            })}
          </g>
        )
      })}
    </svg>
  )
}
