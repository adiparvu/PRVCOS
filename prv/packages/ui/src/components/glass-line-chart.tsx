"use client"

import React, { useMemo, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChartSeries {
  label: string
  color?: string
  data: number[]
}

export interface GlassLineChartProps {
  series: ChartSeries[]
  labels: string[]
  height?: number
  showDots?: boolean
  showGrid?: boolean
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

const LINE_CSS = `@keyframes prvChartDraw{to{stroke-dashoffset:0}}@keyframes prvChartFade{from{opacity:0}to{opacity:1}}`

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

export function GlassLineChart({
  series,
  labels,
  height = 220,
  showDots = true,
  showGrid = true,
  animated = true,
  legend = true,
  onHover,
  title,
  subtitle,
  className,
  style,
}: GlassLineChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const n = labels.length
  const allVals = series.flatMap((s) => s.data)
  const maxV = Math.max(...allVals)
  const rawMin = Math.min(...allVals)
  const vPad = (maxV - rawMin) * 0.12
  const minV = Math.max(0, rawMin - vPad)

  const xPos = (i: number) => PL + (n <= 1 ? CW / 2 : (i / (n - 1)) * CW)
  const yPos = (v: number) => PT + CH - ((v - minV) / (maxV - minV || 1)) * CH

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
      <style>{LINE_CSS}</style>
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
                        width: 16,
                        height: 2,
                        borderRadius: 1,
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
            {showGrid &&
              gridVals.map((v) => {
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

            {/* Series lines + dots */}
            {series.map((s, si) => {
              const color = s.color ?? COLORS[si % COLORS.length]
              const pts = s.data.map((v, i) => ({ x: xPos(i), y: yPos(v) }))
              const d = smoothPath(pts)
              const delay = si * 200

              return (
                <g key={si}>
                  <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={si === 0 ? 2 : 1.5}
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
                  {showDots &&
                    pts.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={si === 0 ? 3.5 : 2.5}
                        fill={color}
                        stroke="#000"
                        strokeWidth={1.5}
                        style={
                          animated
                            ? {
                                animation: `prvChartFade 300ms ease ${delay + 800}ms both`,
                                opacity: 0,
                              }
                            : undefined
                        }
                      />
                    ))}
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
                minWidth: 130,
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
