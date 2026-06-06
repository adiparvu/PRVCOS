"use client"

import React, { useCallback, useEffect, useRef } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

/** A [low, high] tuple. */
export type RangeValue = [number, number]

export interface GlassRangeSliderProps {
  min?: number
  max?: number
  step?: number
  value: RangeValue
  onChange: (value: RangeValue) => void
  /** Format the value pills + ARIA text (e.g. (v) => `€${v}`). */
  formatLabel?: (value: number) => string
  /** Show the value pills above the track. */
  showValues?: boolean
  /** Tick labels rendered under the track. */
  scale?: Array<number | string>
  disabled?: boolean
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
}

type Handle = "lo" | "hi"

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassRangeSlider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  formatLabel = (v) => String(v),
  showValues = true,
  scale,
  disabled = false,
  ariaLabel = "Range",
  className,
  style,
}: GlassRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<Handle | null>(null)
  const [lo, hi] = value

  const pct = (v: number) => ((v - min) / (max - min)) * 100

  const snap = useCallback(
    (v: number) => {
      const snapped = Math.round((v - min) / step) * step + min
      return Math.max(min, Math.min(max, snapped))
    },
    [min, max, step]
  )

  const moveTo = useCallback(
    (clientX: number) => {
      const handle = dragging.current
      const el = trackRef.current
      if (!handle || !el) return
      const r = el.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
      const raw = min + ratio * (max - min)
      const snapped = snap(raw)
      if (handle === "lo") {
        onChange([Math.min(snapped, hi - step), hi])
      } else {
        onChange([lo, Math.max(snapped, lo + step)])
      }
    },
    [min, max, step, lo, hi, onChange, snap]
  )

  // Global drag listeners (mouse + touch)
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return
      const clientX = "touches" in e ? e.touches[0]?.clientX : (e as MouseEvent).clientX
      if (clientX !== undefined) moveTo(clientX)
    }
    const onUp = () => {
      dragging.current = null
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    document.addEventListener("touchmove", onMove, { passive: false })
    document.addEventListener("touchend", onUp)
    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      document.removeEventListener("touchmove", onMove)
      document.removeEventListener("touchend", onUp)
    }
  }, [moveTo])

  const startDrag = (handle: Handle) => () => {
    if (!disabled) dragging.current = handle
  }

  const onKeyDown = (handle: Handle) => (e: React.KeyboardEvent) => {
    if (disabled) return
    let delta = 0
    if (e.key === "ArrowRight" || e.key === "ArrowUp") delta = step
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") delta = -step
    else return
    e.preventDefault()
    if (handle === "lo") {
      onChange([snap(Math.min(lo + delta, hi - step)), hi])
    } else {
      onChange([lo, snap(Math.max(hi + delta, lo + step))])
    }
  }

  const knobStyle = (left: number): React.CSSProperties => ({
    position: "absolute",
    top: "50%",
    left: `${left}%`,
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.2)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    transform: "translate(-50%,-50%)",
    cursor: disabled ? "default" : "grab",
    touchAction: "none",
  })

  return (
    <div
      className={clsx(className)}
      style={{ width: "100%", opacity: disabled ? 0.5 : 1, ...style }}
    >
      {/* Value pills */}
      {showValues && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          {[lo, hi].map((v, i) => (
            <span
              key={i}
              style={{
                padding: "5px 12px",
                borderRadius: 100,
                background: "var(--prv-g2)",
                border: "1px solid var(--prv-border-subtle)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--prv-text-1)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatLabel(v)}
            </span>
          ))}
        </div>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        style={{
          position: "relative",
          height: 6,
          borderRadius: 100,
          background: "var(--prv-g2)",
        }}
      >
        {/* Filled segment */}
        <div
          style={{
            position: "absolute",
            top: 0,
            height: "100%",
            borderRadius: 100,
            left: `${pct(lo)}%`,
            width: `${pct(hi) - pct(lo)}%`,
            background: "var(--prv-accent, rgba(10,132,255,0.9))",
          }}
        />

        {/* Low handle */}
        <div
          role="slider"
          aria-label={`${ariaLabel} minimum`}
          aria-valuemin={min}
          aria-valuemax={hi}
          aria-valuenow={lo}
          aria-valuetext={formatLabel(lo)}
          tabIndex={disabled ? -1 : 0}
          onMouseDown={startDrag("lo")}
          onTouchStart={startDrag("lo")}
          onKeyDown={onKeyDown("lo")}
          style={knobStyle(pct(lo))}
        />

        {/* High handle */}
        <div
          role="slider"
          aria-label={`${ariaLabel} maximum`}
          aria-valuemin={lo}
          aria-valuemax={max}
          aria-valuenow={hi}
          aria-valuetext={formatLabel(hi)}
          tabIndex={disabled ? -1 : 0}
          onMouseDown={startDrag("hi")}
          onTouchStart={startDrag("hi")}
          onKeyDown={onKeyDown("hi")}
          style={knobStyle(pct(hi))}
        />
      </div>

      {/* Scale ticks */}
      {scale && scale.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 12,
            fontSize: 11,
            color: "var(--prv-text-4)",
          }}
        >
          {scale.map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
      )}
    </div>
  )
}
