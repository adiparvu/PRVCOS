"use client"

import React, { useEffect, useRef } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassNumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Suffix shown after the field (e.g. "%", "kg"). */
  unit?: string
  /** Hold a button to repeat increments. Default true. */
  holdToRepeat?: boolean
  disabled?: boolean
  /** Accessible label for the field. */
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/** Round to the step grid to avoid float drift (e.g. 0.1 + 0.2). */
function snap(v: number, step: number, min: number): number {
  if (step <= 0) return v
  const steps = Math.round((v - min) / step)
  const snapped = min + steps * step
  // Trim float noise to the step's decimal precision.
  const decimals = (String(step).split(".")[1] ?? "").length
  return Number(snapped.toFixed(decimals))
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassNumberStepper({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  unit,
  holdToRepeat = true,
  disabled = false,
  ariaLabel,
  className,
  style,
}: GlassNumberStepperProps) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const atMin = value <= min
  const atMax = value >= max

  const stopRepeat = () => {
    if (delayRef.current) clearTimeout(delayRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    delayRef.current = null
    timerRef.current = null
  }

  useEffect(() => stopRepeat, [])

  const apply = (dir: 1 | -1) => {
    const next = clamp(snap(value + dir * step, step, min === -Infinity ? 0 : min), min, max)
    if (next !== value) onChange(next)
  }

  const startRepeat = (dir: 1 | -1) => {
    if (disabled) return
    apply(dir)
    if (!holdToRepeat) return
    // Read latest value on each tick via functional clamp against bounds.
    delayRef.current = setTimeout(() => {
      timerRef.current = setInterval(() => apply(dir), 70)
    }, 350)
  }

  const handleField = (raw: string) => {
    if (raw === "" || raw === "-") return
    const parsed = Number(raw)
    if (Number.isNaN(parsed)) return
    onChange(clamp(parsed, min, max))
  }

  return (
    <div
      className={clsx(className)}
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--prv-g2)",
        border: "1px solid var(--prv-border)",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <StepButton
        label="Decrease"
        symbol="−"
        disabled={disabled || atMin}
        onStart={() => startRepeat(-1)}
        onStop={stopRepeat}
      />

      <input
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        disabled={disabled}
        value={String(value)}
        onChange={(e) => handleField(e.target.value)}
        onBlur={(e) => {
          // Normalize on blur (snap + clamp).
          const parsed = Number(e.target.value)
          if (Number.isNaN(parsed)) return
          const fixed = clamp(snap(parsed, step, min === -Infinity ? 0 : min), min, max)
          if (fixed !== value) onChange(fixed)
        }}
        style={{
          width: 76,
          textAlign: "center",
          background: "transparent",
          border: "none",
          borderLeft: "1px solid var(--prv-border-subtle)",
          borderRight: "1px solid var(--prv-border-subtle)",
          outline: "none",
          color: "var(--prv-text-1)",
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "inherit",
        }}
      />

      {unit && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0 14px",
            color: "var(--prv-text-3)",
            fontSize: 13,
            borderRight: "1px solid var(--prv-border-subtle)",
          }}
        >
          {unit}
        </span>
      )}

      <StepButton
        label="Increase"
        symbol="+"
        disabled={disabled || atMax}
        onStart={() => startRepeat(1)}
        onStop={stopRepeat}
      />
    </div>
  )
}

// ── Step button ───────────────────────────────────────────────────────────────

function StepButton({
  label,
  symbol,
  disabled,
  onStart,
  onStop,
}: {
  label: string
  symbol: string
  disabled: boolean
  onStart: () => void
  onStop: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onMouseDown={onStart}
      onMouseUp={onStop}
      onMouseLeave={(e) => {
        onStop()
        ;(e.currentTarget as HTMLButtonElement).style.background = "transparent"
      }}
      onTouchStart={(e) => {
        e.preventDefault()
        onStart()
      }}
      onTouchEnd={onStop}
      style={{
        width: 42,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        color: disabled ? "var(--prv-text-4)" : "var(--prv-text-1)",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 18,
        transition: "background 130ms",
      }}
      onMouseEnter={(e) => {
        if (disabled) return
        ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g3)"
      }}
    >
      {symbol}
    </button>
  )
}
