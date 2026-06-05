"use client"

import React, { useMemo, useState } from "react"
import { clsx } from "clsx"
import type { ChartSeries } from "./glass-line-chart"

// ── Types ─────────────────────────────────────────────────────────────────────

export type { ChartSeries }

export interface GlassBarChartProps {
  series: ChartSeries[]
  labels: string[]
  height?: number
  showValues?: boolean
  animated?: boolean
  legend?: boolean
  onBarClick?: (seriesIndex: number, dataIndex: number, value: number) => void
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

const VW = 880
const VH = 200
const PL = 48
const PR = 12
const PT = 8
const PB = 32
const CW = VW - PL - PR
const CH = VH - PT - PB

const BAR_CSS = `@keyframes prvBarFill{from{transform:scaleY(0)}to{transform:scaleY(1)}}@keyframes prvChartFade{from{opacity:0}to{opacity:1}}`

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassBarChart({
  series,
  labels,
  height = 220,
  showValues = false,
  animated = true,
  legend = true,
  onBarClick,
  title,
  subtitle,
  className,
  style,
}: GlassBarChartProps) {
  const [hovered, setHovered] = useState<{ gi: number; si: number } | null>(null)

  const numGroups = labels.length
  const numSeries = series.length

  const allVals = series.flatMap((s) => s.data)
  const maxV = Math.max(...allVals, 1) * 1.12

  const yPos = (v: number) => PT + CH - (v / maxV) * CH

  const gridVals = useMemo(() => {
    const range = maxV
    const rawStep = range / 4
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const step = Math.ceil(rawStep / mag) * mag
    const vals: number[] = []
    let v = step
    while (v < maxV) {
      vals.push(Math.round(v))
      v += step
    }
    return vals
  }, [maxV])

  // Bar geometry
  const barW = Math.max(8, Math.min(22, (CW / numGroups - (numSeries - 1) * 4) / numSeries / 1.5))
  const gapInGroup = 4
  const groupW = numSeries * barW + (numSeries - 1) * gapInGroup
  const groupGap = (CW - groupW * numGroups) / (numGroups + 1)

  const groupX = (gi: number) => PL + groupGap * (gi + 1) + groupW * gi
  const barX = (gi: number, si: number) => groupX(gi) + si * (barW + gapInGroup)

  const showHeader = !!(title || subtitle || (legend && series.length > 0))

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
      <style>{BAR_CSS}</style>
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
        }}
        aria-hidden="true"
      />

      <div style={{ padding: "20px 20px 16px" }}>
        {showHeader && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 16,
              gap: 12,
            }}
          >
            <div>
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
            {legend && (
              <div
                style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}
              >
                {series.map((s, si) => (
                  <div
                    key={si}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: "var(--prv-text-2)",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: s.color ?? COLORS[si % COLORS.length],
                        flexShrink: 0,
                      }}
                    />
                    {s.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ position: "relative" }}>
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            preserveAspectRatio="none"
            style={{ width: "100%", height, overflow: "visible", display: "block" }}
          >
            {/* Grid */}
            {gridVals.map((v) => {
              const y = yPos(v)
              return (
                <g key={v}>
                  <line
                    x1={PL}
                    y1={y}
                    x2={VW - PR}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={1}
                  />
                  <text
                    x={PL - 6}
                    y={y + 4}
                    fill="rgba(255,255,255,0.3)"
                    fontSize={10}
                    textAnchor="end"
                    fontFamily="-apple-system,sans-serif"
                  >
                    {v}
                  </text>
                </g>
              )
            })}

            {/* Baseline */}
            <line
              x1={PL}
              y1={PT + CH}
              x2={VW - PR}
              y2={PT + CH}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />

            {/* Groups */}
            {labels.map((l, gi) => {
              const gx = groupX(gi)
              return (
                <g key={gi}>
                  {/* X label */}
                  <text
                    x={gx + groupW / 2}
                    y={VH - 6}
                    fill="rgba(255,255,255,0.3)"
                    fontSize={10}
                    textAnchor="middle"
                    fontFamily="-apple-system,sans-serif"
                  >
                    {l}
                  </text>

                  {series.map((s, si) => {
                    const color = s.color ?? COLORS[si % COLORS.length]
                    const val = s.data[gi] ?? 0
                    const barH = (val / maxV) * CH
                    const bx = barX(gi, si)
                    const by = PT + CH - barH
                    const isHov = hovered?.gi === gi && hovered?.si === si
                    const delay = gi * 60 + si * 30

                    return (
                      <g key={si}>
                        <rect
                          x={bx}
                          y={by}
                          width={barW}
                          height={barH}
                          rx={3}
                          fill={color}
                          opacity={isHov ? 0.72 : 1}
                          style={{
                            transformBox: "fill-box",
                            transformOrigin: "bottom",
                            cursor: onBarClick ? "pointer" : "default",
                            transition: "opacity 100ms",
                            ...(animated
                              ? {
                                  animation: `prvBarFill 600ms cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both`,
                                }
                              : undefined),
                          }}
                          onMouseEnter={() => setHovered({ gi, si })}
                          onMouseLeave={() => setHovered(null)}
                          onClick={() => onBarClick?.(si, gi, val)}
                        />
                        {showValues && (
                          <text
                            x={bx + barW / 2}
                            y={by - 4}
                            fill="rgba(255,255,255,0.3)"
                            fontSize={10}
                            textAnchor="middle"
                            fontFamily="-apple-system,sans-serif"
                            style={
                              animated
                                ? {
                                    animation: `prvChartFade 300ms ease ${delay + 500}ms both`,
                                    opacity: 0,
                                  }
                                : undefined
                            }
                          >
                            {val}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>

          {/* Tooltip */}
          {hovered !== null &&
            (() => {
              const { gi, si } = hovered
              const s = series[si]
              const val = s?.data[gi] ?? 0
              const color = s?.color ?? COLORS[si % COLORS.length]
              const bx = barX(gi, si)

              return (
                <div
                  style={{
                    position: "absolute",
                    pointerEvents: "none",
                    zIndex: 20,
                    background: "var(--prv-g3)",
                    border: "1px solid var(--prv-border)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    backdropFilter: "blur(32px) saturate(160%)",
                    WebkitBackdropFilter: "blur(32px) saturate(160%)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    minWidth: 120,
                    top: 12,
                    ...(gi >= Math.ceil(numGroups * 0.65)
                      ? { right: `calc(${(1 - bx / VW) * 100}% + 8px)` }
                      : { left: `calc(${(bx / VW) * 100}% + 16px)` }),
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--prv-text-3)",
                      marginBottom: 6,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {labels[gi]}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, fontSize: 12, color: "var(--prv-text-2)" }}>
                      {s?.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--prv-text-1)" }}>
                      {val}
                    </span>
                  </div>
                </div>
              )
            })()}
        </div>
      </div>
    </div>
  )
}
