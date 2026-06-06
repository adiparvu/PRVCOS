"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HeatmapValue {
  /** ISO date "YYYY-MM-DD". */
  date: string
  count: number
}

export interface GlassHeatmapProps {
  values: HeatmapValue[]
  /** Number of trailing weeks to render. Default 26. */
  weeks?: number
  /** End date (ISO). Defaults to today. */
  endDate?: string
  /** Cell side length in px. Default 12. */
  cellSize?: number
  /** Gap between cells in px. Default 4. */
  gap?: number
  /** Base color for the highest intensity. Default accent blue. */
  baseColor?: string
  /** Show the Less→More legend. Default true. */
  showLegend?: boolean
  onCellClick?: (date: string, count: number) => void
  className?: string
  style?: React.CSSProperties
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0")
}
function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function parse(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

// ── Intensity ─────────────────────────────────────────────────────────────────

const LEVEL_OPACITY = [0, 0.25, 0.5, 0.75, 1]

function levelFor(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) return 0
  const ratio = count / maxCount
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}

/** Inject opacity into an `rgb(...)`/`rgba(...)` color, or fall back to opacity wrapper. */
function withOpacity(color: string, opacity: number): string {
  const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/)
  if (rgbMatch) {
    const parts = rgbMatch[1]!.split(",").map((s) => s.trim())
    const [r, g, b] = parts
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  return color // var()/hex — opacity applied via fillOpacity on the rect instead
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassHeatmap({
  values,
  weeks = 26,
  endDate,
  cellSize = 12,
  gap = 4,
  baseColor = "rgba(10,132,255,1)",
  showLegend = true,
  onCellClick,
  className,
  style,
}: GlassHeatmapProps) {
  const counts = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const v of values) map.set(v.date, (map.get(v.date) ?? 0) + v.count)
    return map
  }, [values])

  const maxCount = React.useMemo(() => values.reduce((m, v) => Math.max(m, v.count), 0), [values])

  // Build the grid: align the end date to the end of its week (Sat).
  const end = endDate ? parse(endDate) : new Date()
  const gridEnd = new Date(end)
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()))

  const totalDays = weeks * 7
  const cells: Array<{ key: string; level: number; count: number; w: number; d: number }> = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date(gridEnd)
    date.setDate(date.getDate() - i)
    const key = toKey(date)
    const count = counts.get(key) ?? 0
    const offset = totalDays - 1 - i
    cells.push({
      key,
      count,
      level: levelFor(count, maxCount),
      w: Math.floor(offset / 7),
      d: date.getDay(),
    })
  }

  const svgW = weeks * (cellSize + gap) - gap
  const svgH = 7 * (cellSize + gap) - gap

  const cellColor = (level: number): { fill: string; opacity?: number } => {
    if (level === 0) return { fill: "var(--prv-g2)" }
    const op = LEVEL_OPACITY[level] ?? 1
    const injected = withOpacity(baseColor, op)
    // If color was a var()/hex, opacity wasn't applied — use fillOpacity.
    if (injected === baseColor && !baseColor.startsWith("rgb")) {
      return { fill: baseColor, opacity: op }
    }
    return { fill: injected }
  }

  return (
    <div className={clsx(className)} style={style}>
      <svg
        width="100%"
        viewBox={`0 0 ${svgW} ${svgH}`}
        role="img"
        aria-label="Activity heatmap"
        style={{ display: "block" }}
      >
        {cells.map((c) => {
          const { fill, opacity } = cellColor(c.level)
          return (
            <rect
              key={c.key}
              x={c.w * (cellSize + gap)}
              y={c.d * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              rx={3}
              fill={fill}
              fillOpacity={opacity}
              style={{ cursor: onCellClick ? "pointer" : undefined }}
              onClick={onCellClick ? () => onCellClick(c.key, c.count) : undefined}
            >
              <title>{`${c.key}: ${c.count}`}</title>
            </rect>
          )
        })}
      </svg>

      {showLegend && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "var(--prv-text-3)",
            marginTop: 14,
            justifyContent: "flex-end",
          }}
        >
          Less
          {LEVEL_OPACITY.map((_, level) => {
            const { fill, opacity } = cellColor(level)
            return (
              <span
                key={level}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 3,
                  background: fill,
                  opacity,
                  display: "inline-block",
                }}
              />
            )
          })}
          More
        </div>
      )}
    </div>
  )
}
