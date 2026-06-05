"use client"

import React, { useCallback, useRef } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SliderBase {
  min?: number
  max?: number
  step?: number
  color?: string
  disabled?: boolean
  label?: string
  formatValue?: (v: number) => string
  className?: string
  style?: React.CSSProperties
}

interface GlassSliderSingleProps extends SliderBase {
  range?: false
  value: number
  onChange: (v: number) => void
}

interface GlassSliderRangeProps extends SliderBase {
  range: true
  value: [number, number]
  onChange: (v: [number, number]) => void
}

export type GlassSliderProps = GlassSliderSingleProps | GlassSliderRangeProps

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function snap(raw: number, min: number, max: number, step: number) {
  const stepped = Math.round((raw - min) / step) * step + min
  return clamp(stepped, min, max)
}

function pct(v: number, min: number, max: number) {
  return ((v - min) / (max - min)) * 100
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassSlider(props: GlassSliderProps) {
  const {
    min = 0,
    max = 100,
    step = 1,
    color,
    disabled = false,
    label,
    formatValue,
    className,
    style,
  } = props

  const trackRef = useRef<HTMLDivElement>(null)

  const resolveValue = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return min
      const rect = trackRef.current.getBoundingClientRect()
      const raw = ((clientX - rect.left) / rect.width) * (max - min) + min
      return snap(raw, min, max, step)
    },
    [min, max, step]
  )

  // Single thumb drag
  const startSingleDrag = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled || props.range) return
      e.preventDefault()

      const move = (ev: MouseEvent | TouchEvent) => {
        const clientX = "touches" in ev ? (ev.touches[0]?.clientX ?? 0) : ev.clientX
        ;(props as GlassSliderSingleProps).onChange(resolveValue(clientX))
      }
      const up = () => {
        document.removeEventListener("mousemove", move)
        document.removeEventListener("mouseup", up)
        document.removeEventListener("touchmove", move)
        document.removeEventListener("touchend", up)
      }
      document.addEventListener("mousemove", move)
      document.addEventListener("mouseup", up)
      document.addEventListener("touchmove", move, { passive: false })
      document.addEventListener("touchend", up)

      // also handle the initial click position
      const clientX =
        "touches" in e.nativeEvent
          ? ((e.nativeEvent as TouchEvent).touches[0]?.clientX ?? 0)
          : (e.nativeEvent as MouseEvent).clientX
      ;(props as GlassSliderSingleProps).onChange(resolveValue(clientX))
    },
    [disabled, props, resolveValue]
  )

  // Range thumb drag
  const startRangeDrag = useCallback(
    (thumb: "lo" | "hi") => (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled || !props.range) return
      e.preventDefault()
      e.stopPropagation()

      const move = (ev: MouseEvent | TouchEvent) => {
        const clientX = "touches" in ev ? (ev.touches[0]?.clientX ?? 0) : ev.clientX
        const next = resolveValue(clientX)
        const [lo, hi] = (props as GlassSliderRangeProps).value
        if (thumb === "lo") {
          ;(props as GlassSliderRangeProps).onChange([Math.min(next, hi - step), hi])
        } else {
          ;(props as GlassSliderRangeProps).onChange([lo, Math.max(next, lo + step)])
        }
      }
      const up = () => {
        document.removeEventListener("mousemove", move)
        document.removeEventListener("mouseup", up)
        document.removeEventListener("touchmove", move)
        document.removeEventListener("touchend", up)
      }
      document.addEventListener("mousemove", move)
      document.addEventListener("mouseup", up)
      document.addEventListener("touchmove", move, { passive: false })
      document.addEventListener("touchend", up)
    },
    [disabled, props, resolveValue, step]
  )

  const fillColor = color ?? "var(--prv-text-1)"
  const thumbColor = color ?? "var(--prv-text-1)"

  if (props.range) {
    const [lo, hi] = props.value
    const loP = pct(lo, min, max)
    const hiP = pct(hi, min, max)
    const fmt = formatValue ?? String

    return (
      <div className={clsx("flex flex-col gap-2", className)} style={style}>
        {label && (
          <div className="flex justify-between items-baseline">
            <span style={{ fontSize: 13, color: "var(--prv-text-2)" }}>{label}</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--prv-text-1)",
              }}
            >
              {fmt(lo)} – {fmt(hi)}
            </span>
          </div>
        )}
        <div
          style={{
            position: "relative",
            height: 28,
            display: "flex",
            alignItems: "center",
            cursor: disabled ? "not-allowed" : "default",
            opacity: disabled ? 0.4 : 1,
          }}
        >
          {/* track */}
          <div
            ref={trackRef}
            style={{
              position: "absolute",
              inset: "0 0",
              height: 4,
              top: "50%",
              transform: "translateY(-50%)",
              borderRadius: 100,
              background: "var(--prv-g3)",
            }}
          />
          {/* range fill */}
          <div
            style={{
              position: "absolute",
              left: `${loP}%`,
              width: `${hiP - loP}%`,
              height: 4,
              top: "50%",
              transform: "translateY(-50%)",
              borderRadius: 100,
              background: fillColor,
              pointerEvents: "none",
            }}
          />
          {/* low thumb */}
          <Thumb
            pct={loP}
            color={thumbColor}
            onMouseDown={startRangeDrag("lo")}
            onTouchStart={startRangeDrag("lo")}
          />
          {/* high thumb */}
          <Thumb
            pct={hiP}
            color={thumbColor}
            onMouseDown={startRangeDrag("hi")}
            onTouchStart={startRangeDrag("hi")}
          />
        </div>
      </div>
    )
  }

  // Single
  const v = props.value
  const vP = pct(v, min, max)
  const fmt = formatValue ?? String

  return (
    <div className={clsx("flex flex-col gap-2", className)} style={style}>
      {label && (
        <div className="flex justify-between items-baseline">
          <span style={{ fontSize: 13, color: "var(--prv-text-2)" }}>{label}</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--prv-text-1)",
            }}
          >
            {fmt(v)}
          </span>
        </div>
      )}
      <div
        style={{
          position: "relative",
          height: 28,
          display: "flex",
          alignItems: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
        }}
        onMouseDown={startSingleDrag}
        onTouchStart={startSingleDrag}
      >
        {/* track */}
        <div
          ref={trackRef}
          style={{
            position: "absolute",
            inset: 0,
            height: 4,
            top: "50%",
            transform: "translateY(-50%)",
            borderRadius: 100,
            background: "var(--prv-g3)",
          }}
        />
        {/* fill */}
        <div
          style={{
            position: "absolute",
            left: 0,
            width: `${vP}%`,
            height: 4,
            top: "50%",
            transform: "translateY(-50%)",
            borderRadius: 100,
            background: fillColor,
            pointerEvents: "none",
          }}
        />
        <Thumb
          pct={vP}
          color={thumbColor}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}

// ── Thumb ─────────────────────────────────────────────────────────────────────

function Thumb({
  pct: p,
  color,
  onMouseDown,
  onTouchStart,
}: {
  pct: number
  color: string
  onMouseDown: React.MouseEventHandler
  onTouchStart: React.TouchEventHandler
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{
        position: "absolute",
        left: `${p}%`,
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: color,
        border: "1px solid rgba(255,255,255,0.2)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
        cursor: "grab",
        transition: "transform 100ms ease, box-shadow 100ms ease",
        zIndex: 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.12)"
        e.currentTarget.style.boxShadow =
          "0 4px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)"
        e.currentTarget.style.boxShadow =
          "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)"
      }}
    />
  )
}
