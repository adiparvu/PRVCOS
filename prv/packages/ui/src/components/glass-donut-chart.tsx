"use client"

import React, { useEffect, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DonutSegment {
  label: string
  value: number
  color?: string
}

export interface GlassDonutChartProps {
  segments: DonutSegment[]
  size?: number
  strokeWidth?: number
  centerLabel?: string
  centerValue?: string
  animated?: boolean
  showLegend?: boolean
  onSegmentClick?: (segment: DonutSegment, index: number) => void
  title?: string
  subtitle?: string
  className?: string
  style?: React.CSSProperties
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = [
  "rgba(255,255,255,0.85)",
  "rgba(10,132,255,0.85)",
  "rgba(48,209,88,0.85)",
  "rgba(255,149,0,0.85)",
  "rgba(255,59,48,0.85)",
  "rgba(191,90,242,0.85)",
]

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassDonutChart({
  segments,
  size = 180,
  strokeWidth = 22,
  centerLabel,
  centerValue,
  animated = true,
  showLegend = true,
  onSegmentClick,
  title,
  subtitle,
  className,
  style,
}: GlassDonutChartProps) {
  const [mounted, setMounted] = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  useEffect(() => {
    if (!animated) {
      setMounted(true)
      return
    }
    // Double rAF ensures initial strokeDashoffset paints before the transition fires
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)))
    return () => cancelAnimationFrame(id)
  }, [animated])

  const cx = size / 2
  const cy = size / 2
  const r = (size - strokeWidth) / 2 - 2
  const circ = 2 * Math.PI * r
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1
  const arcGap = 3

  // Pre-compute each segment's geometry
  let acc = 0
  const computed = segments.map((seg) => {
    const frac = seg.value / total
    const arcLen = frac * circ
    const dash = Math.max(0, arcLen - arcGap)
    const targetOffset = circ - acc
    acc += arcLen
    return { ...seg, dash, targetOffset }
  })

  const hSeg = hoveredIdx !== null ? computed[hoveredIdx] : null
  const displayValue = hSeg ? String(hSeg.value) : (centerValue ?? String(total))
  const displayLabel = hSeg ? hSeg.label : (centerLabel ?? "Total")
  const showHeader = !!(title || subtitle)

  return (
    <div
      className={clsx("relative overflow-hidden border", className)}
      style={{
        borderRadius: 20,
        background: "var(--prv-g1)",
        borderColor: "var(--prv-border-subtle)",
        ...style,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
        }}
        aria-hidden="true"
      />

      <div style={{ padding: "20px 20px 20px" }}>
        {showHeader && (
          <div style={{ marginBottom: 16 }}>
            {title && (
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)" }}>
                {title}
              </div>
            )}
            {subtitle && (
              <div style={{ fontSize: 12, color: "var(--prv-text-3)", marginTop: 2 }}>
                {subtitle}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ flexShrink: 0 }}>
            {/* Track ring */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={strokeWidth}
            />

            {/* Segments */}
            {computed.map((seg, i) => {
              const color = seg.color ?? COLORS[i % COLORS.length]
              const isHovered = hoveredIdx === i
              const sw = isHovered ? strokeWidth + 4 : strokeWidth

              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={color}
                  strokeWidth={sw}
                  strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
                  strokeDashoffset={mounted ? seg.targetOffset : circ}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${cx} ${cy})`}
                  style={{
                    transition: animated
                      ? `stroke-dashoffset 700ms cubic-bezier(0.4,0,0.2,1) ${i * 100 + 100}ms, stroke-width 150ms ease`
                      : "stroke-width 150ms ease",
                    cursor: onSegmentClick ? "pointer" : "default",
                  }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onSegmentClick?.(seg, i)}
                />
              )
            })}

            {/* Center value */}
            <text
              x={cx}
              y={cy + 2}
              textAnchor="middle"
              fill="rgba(255,255,255,0.95)"
              fontSize={20}
              fontWeight={700}
              fontFamily="-apple-system,sans-serif"
              letterSpacing="-0.02em"
              style={{ pointerEvents: "none", transition: "all 150ms" }}
            >
              {displayValue}
            </text>

            {/* Center label */}
            <text
              x={cx}
              y={cy + 17}
              textAnchor="middle"
              fill="rgba(255,255,255,0.35)"
              fontSize={10}
              fontFamily="-apple-system,sans-serif"
              style={{ pointerEvents: "none", transition: "all 150ms" }}
            >
              {displayLabel}
            </text>
          </svg>

          {/* Legend */}
          {showLegend && (
            <div
              style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}
            >
              {computed.map((seg, i) => {
                const color = seg.color ?? COLORS[i % COLORS.length]
                const isHov = hoveredIdx === i

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: isHov ? "var(--prv-text-1)" : "var(--prv-text-2)",
                      transition: "color 150ms",
                      cursor: onSegmentClick ? "pointer" : "default",
                    }}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => onSegmentClick?.(seg, i)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: color,
                          flexShrink: 0,
                          transition: "transform 150ms",
                          transform: isHov ? "scale(1.3)" : "scale(1)",
                        }}
                      />
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {seg.label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontWeight: 600,
                        color: "var(--prv-text-1)",
                        flexShrink: 0,
                        marginLeft: 8,
                      }}
                    >
                      {seg.value}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
