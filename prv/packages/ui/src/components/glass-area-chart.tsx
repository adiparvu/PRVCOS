"use client"

import React, { useMemo, useId, useState } from "react"
import { clsx } from "clsx"
import type { ChartSeries } from "./glass-line-chart"

// ── Types ─────────────────────────────────────────────────────────────────────

export type { ChartSeries }

export interface GlassAreaChartProps {
  series: ChartSeries[]
  labels: string[]
  height?: number
  animated?: boolean
  legend?: boolean
  onHover?: (label: string, index: number) => void
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

const AREA_CSS = `@keyframes prvChartDraw{to{stroke-dashoffset:0}}@keyframes prvAreaFade{from{opacity:0}to{opacity:1}}`

// ── Helpers ───────────────────────────────────────────────────────────────────

function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return ""
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!
    const c = pts[i]!
    const mx = (p.x + c.x) / 2
    d += ` C ${mx} ${p.y}, ${mx} ${c.y}, ${c.x} ${c.y}`
  }
  return d
}

function computeGridVals(minV: number, maxV: number): number[] {
  const range = maxV - minV
  if (range <= 0) return []
  const rawStep = range / 4
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const step = Math.ceil(rawStep / mag) * mag
  const vals: number[] = []
  let v = Math.ceil((minV + 1) / step) * step
  while (v < maxV) {
    vals.push(Math.round(v))
    v += step
  }
  return vals
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassAreaChart({
  series,
  labels,
  height = 220,
  animated = true,
  legend = true,
  onHover,
  title,
  subtitle,
  className,
  style,
}: GlassAreaChartProps) {
  const uid = useId()
  const [hovered, setHovered] = useState<number | null>(null)

  const n = labels.length
  const allVals = series.flatMap((s) => s.data)
  const maxV = Math.max(...allVals) * 1.1
  const minV = 0

  const xPos = (i: number) => PL + (n <= 1 ? CW / 2 : (i / (n - 1)) * CW)
  const yPos = (v: number) => PT + CH - (v / (maxV || 1)) * CH

  const gridVals = useMemo(() => computeGridVals(minV, maxV), [minV, maxV])
  const hitW = n > 1 ? CW / (n - 1) : CW
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
      <style>{AREA_CSS}</style>
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
            <defs>
              {series.map((s, si) => {
                const color = s.color ?? COLORS[si % COLORS.length]
                return (
                  <linearGradient key={si} id={`${uid}-ag-${si}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                )
              })}
            </defs>

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

            {/* X labels */}
            {labels.map((l, i) => (
              <text
                key={i}
                x={xPos(i)}
                y={VH - 6}
                fill="rgba(255,255,255,0.3)"
                fontSize={10}
                textAnchor="middle"
                fontFamily="-apple-system,sans-serif"
              >
                {l}
              </text>
            ))}

            {/* Crosshair */}
            {hovered !== null && (
              <line
                x1={xPos(hovered)}
                y1={PT}
                x2={xPos(hovered)}
                y2={PT + CH}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1}
                strokeDasharray="4 3"
                style={{ pointerEvents: "none" }}
              />
            )}

            {/* Areas + lines (render back-to-front so first series is on top) */}
            {[...series].reverse().map((s, ri) => {
              const si = series.length - 1 - ri
              const color = s.color ?? COLORS[si % COLORS.length]
              const pts = s.data.map((v, i) => ({ x: xPos(i), y: yPos(v) }))
              const linePath = smoothPath(pts)
              const first = pts[0]!
              const last = pts[pts.length - 1]!
              const areaPath = `${linePath} L ${last.x} ${yPos(0)} L ${first.x} ${yPos(0)} Z`
              const delay = si * 150

              return (
                <g key={si}>
                  {/* Area fill */}
                  <path
                    d={areaPath}
                    fill={`url(#${uid}-ag-${si})`}
                    style={
                      animated
                        ? { animation: `prvAreaFade 600ms ease ${delay + 200}ms both`, opacity: 0 }
                        : undefined
                    }
                  />
                  {/* Line */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeDasharray={animated ? "3000" : undefined}
                    strokeDashoffset={animated ? "3000" : undefined}
                    style={
                      animated
                        ? {
                            animation: `prvChartDraw 900ms cubic-bezier(0.4,0,0.2,1) ${delay}ms forwards`,
                          }
                        : undefined
                    }
                  />
                </g>
              )
            })}

            {/* Hit areas */}
            {labels.map((_, i) => (
              <rect
                key={i}
                x={xPos(i) - hitW / 2}
                y={PT}
                width={hitW}
                height={CH}
                fill="transparent"
                onMouseEnter={() => {
                  setHovered(i)
                  onHover?.(labels[i] ?? "", i)
                }}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </svg>

          {/* Tooltip */}
          {hovered !== null && (
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
                minWidth: 140,
                top: 12,
                ...(hovered >= Math.ceil(n * 0.65)
                  ? { right: `calc(${(1 - xPos(hovered) / VW) * 100}% + 8px)` }
                  : { left: `calc(${(xPos(hovered) / VW) * 100}% + 10px)` }),
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
                {labels[hovered]}
              </div>
              {series.map((s, si) => (
                <div
                  key={si}
                  style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: s.color ?? COLORS[si % COLORS.length],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 12, color: "var(--prv-text-2)" }}>
                    {s.label}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--prv-text-1)" }}>
                    {s.data[hovered] ?? ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
