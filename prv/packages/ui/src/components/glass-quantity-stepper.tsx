"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassQuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** Show a trash icon (instead of "−") when at min, and call onRemove when pressed. */
  removeAtMin?: boolean
  onRemove?: () => void
  disabled?: boolean
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassQuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  removeAtMin = true,
  onRemove,
  disabled = false,
  ariaLabel = "Quantity",
  className,
  style,
}: GlassQuantityStepperProps) {
  const atMin = value <= min
  const atMax = value >= max
  const showTrash = removeAtMin && atMin

  const dec = () => {
    if (disabled) return
    if (showTrash) {
      onRemove?.()
      return
    }
    if (value > min) onChange(value - 1)
  }

  const inc = () => {
    if (disabled || atMax) return
    onChange(value + 1)
  }

  const btnStyle = (active: boolean, danger = false): React.CSSProperties => ({
    width: 38,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    color: danger
      ? "var(--prv-red, rgba(255,69,58,0.95))"
      : active
        ? "var(--prv-text-1)"
        : "var(--prv-text-4)",
    cursor: active ? "pointer" : "not-allowed",
    fontSize: 18,
    transition: "background 130ms",
  })

  return (
    <div
      className={clsx(className)}
      role="group"
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        borderRadius: 100,
        overflow: "hidden",
        background: "var(--prv-g2)",
        border: "1px solid var(--prv-border)",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <button
        type="button"
        aria-label={showTrash ? "Remove" : "Decrease"}
        disabled={disabled}
        onClick={dec}
        style={btnStyle(!disabled, showTrash)}
        onMouseEnter={(e) => {
          if (disabled) return
          ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g3)"
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = "transparent"
        }}
      >
        {showTrash ? <TrashIcon /> : "−"}
      </button>

      <span
        aria-live="polite"
        style={{
          minWidth: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: "var(--prv-text-1)",
        }}
      >
        {value}
      </span>

      <button
        type="button"
        aria-label="Increase"
        disabled={disabled || atMax}
        onClick={inc}
        style={btnStyle(!disabled && !atMax)}
        onMouseEnter={(e) => {
          if (disabled || atMax) return
          ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g3)"
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = "transparent"
        }}
      >
        +
      </button>
    </div>
  )
}
