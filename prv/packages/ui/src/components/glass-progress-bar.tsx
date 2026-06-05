"use client"

import React, { useEffect, useId, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProgressSegment {
  value: number
  color?: string
  label?: string
}

export type ProgressVariant = "default" | "gradient" | "striped" | "indeterminate" | "segmented"
export type ProgressSize = "sm" | "md" | "lg"
export type ProgressColor = "white" | "blue" | "green" | "orange" | "red" | "purple"

export interface GlassProgressBarProps {
  value?: number
  max?: number
  variant?: ProgressVariant
  color?: ProgressColor | string
  size?: ProgressSize
  label?: string
  showValue?: boolean
  animated?: boolean
  segments?: ProgressSegment[]
  className?: string
  style?: React.CSSProperties
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SIZE_H: Record<ProgressSize, number> = {
  sm: 3,
  md: 6,
  lg: 10,
}

const COLOR_MAP: Record<ProgressColor, string> = {
  white: "rgba(255,255,255,0.9)",
  blue: "rgba(10,132,255,0.9)",
  green: "rgba(48,209,88,0.9)",
  orange: "rgba(255,149,0,0.9)",
  red: "rgba(255,59,48,0.9)",
  purple: "rgba(191,90,242,0.9)",
}

const PROGRESS_CSS = `
@keyframes prvIndeterminate{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}
@keyframes prvStripe{from{background-position:0 0}to{background-position:28px 0}}
`

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveColor(color?: ProgressColor | string): string {
  if (!color) return COLOR_MAP.white
  return COLOR_MAP[color as ProgressColor] ?? color
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassProgressBar({
  value = 0,
  max = 100,
  variant = "default",
  color,
  size = "md",
  label,
  showValue = false,
  animated = true,
  segments,
  className,
  style,
}: GlassProgressBarProps) {
  const uid = useId()
  const [ready, setReady] = useState(!animated)

  // Double rAF → fill animates from 0 after first paint
  useEffect(() => {
    if (!animated) return
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)))
    return () => cancelAnimationFrame(id)
  }, [animated])

  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const h = SIZE_H[size]
  const fillColor = resolveColor(color)
  const isIndeterminate = variant === "indeterminate"
  const isSegmented = variant === "segmented"
  const isGradient = variant === "gradient"
  const isStriped = variant === "striped"

  const showHeader = !!(label || showValue)

  return (
    <div className={clsx(className)} style={style}>
      <style>{PROGRESS_CSS}</style>

      {showHeader && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: size === "lg" ? 8 : 6,
          }}
        >
          {label && <span style={{ fontSize: 12, color: "var(--prv-text-2)" }}>{label}</span>}
          {showValue && !isIndeterminate && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--prv-text-1)" }}>
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}

      {isSegmented ? (
        // ── Segmented variant ────────────────────────────────────────────────
        <SegmentedTrack segments={segments ?? []} height={h} ready={ready} animated={animated} />
      ) : (
        // ── Single-fill track ────────────────────────────────────────────────
        <div
          style={{
            width: "100%",
            height: h,
            background: "var(--prv-g2)",
            borderRadius: 100,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {isIndeterminate ? (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: "30%",
                background: `linear-gradient(90deg,transparent,${fillColor},transparent)`,
                borderRadius: 100,
                animation: "prvIndeterminate 1.4s ease-in-out infinite",
              }}
            />
          ) : (
            <div
              style={{
                height: "100%",
                borderRadius: 100,
                width: ready ? `${pct}%` : "0%",
                transition:
                  ready && animated ? "width 800ms cubic-bezier(0.34,1.56,0.64,1)" : undefined,
                ...(isGradient
                  ? {
                      background:
                        "linear-gradient(90deg, rgba(10,132,255,0.9) 0%, rgba(48,209,88,0.9) 100%)",
                    }
                  : { backgroundColor: fillColor }),
                ...(isStriped
                  ? {
                      backgroundImage:
                        "linear-gradient(135deg,rgba(255,255,255,0.12) 25%,transparent 25%,transparent 50%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.12) 75%,transparent 75%)",
                      backgroundSize: "28px 28px",
                      animation: "prvStripe 0.8s linear infinite",
                    }
                  : {}),
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Segmented sub-component ───────────────────────────────────────────────────

const SEG_COLORS = [
  "rgba(255,255,255,0.9)",
  "rgba(10,132,255,0.9)",
  "rgba(48,209,88,0.9)",
  "rgba(255,149,0,0.9)",
  "rgba(255,59,48,0.9)",
  "rgba(191,90,242,0.9)",
]

function SegmentedTrack({
  segments,
  height,
  ready,
  animated,
}: {
  segments: ProgressSegment[]
  height: number
  ready: boolean
  animated: boolean
}) {
  if (segments.length === 0) return null

  const total = segments.reduce((s, x) => s + x.value, 0) || 1

  return (
    <div style={{ display: "flex", gap: 2, height, width: "100%" }}>
      {segments.map((seg, i) => {
        const pct = (seg.value / total) * 100
        const color = seg.color ?? SEG_COLORS[i % SEG_COLORS.length]
        const isFirst = i === 0
        const isLast = i === segments.length - 1

        return (
          <div
            key={i}
            style={{
              height: "100%",
              width: ready ? `${pct}%` : "0%",
              background: color,
              borderRadius:
                isFirst && isLast
                  ? 100
                  : isFirst
                    ? "100px 0 0 100px"
                    : isLast
                      ? "0 100px 100px 0"
                      : 0,
              transition:
                ready && animated
                  ? `width 800ms cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms`
                  : undefined,
              flexShrink: 0,
            }}
          />
        )
      })}
    </div>
  )
}
