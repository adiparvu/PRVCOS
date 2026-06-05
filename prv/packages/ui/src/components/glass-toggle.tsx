"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  label?: string
  description?: string
  className?: string
  style?: React.CSSProperties
}

// ── Size tokens ───────────────────────────────────────────────────────────────

const tokens = {
  sm: { track: [36, 22], thumb: 14, offset: 14 },
  md: { track: [44, 26], thumb: 18, offset: 18 },
  lg: { track: [52, 30], thumb: 22, offset: 22 },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassToggle({
  checked,
  onChange,
  size = "md",
  disabled = false,
  label,
  description,
  className,
  style,
}: GlassToggleProps) {
  const t = tokens[size]

  const track = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative border focus-visible:outline-none"
      style={{
        width: t.track[0],
        height: t.track[1],
        flexShrink: 0,
        borderRadius: 100,
        background: checked ? "#0a84ff" : "var(--prv-g2)",
        borderColor: checked ? "transparent" : "var(--prv-border-subtle)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background 220ms, border-color 220ms",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: 3,
          width: t.thumb,
          height: t.thumb,
          borderRadius: "50%",
          background: checked ? "#fff" : "var(--prv-text-2)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
          transform: checked ? `translateX(${t.offset}px)` : "translateX(0)",
          transition: "transform 280ms cubic-bezier(0.34,1.56,0.64,1), background 220ms",
        }}
        aria-hidden="true"
      />
    </button>
  )

  if (!label) {
    return (
      <div className={className} style={style}>
        {track}
      </div>
    )
  }

  return (
    <div className={clsx("flex items-center gap-3", className)} style={style}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, color: "var(--prv-text-1)", lineHeight: 1.4 }}>{label}</p>
        {description && (
          <p
            style={{
              fontSize: 12,
              color: "var(--prv-text-3)",
              marginTop: 2,
              lineHeight: 1.4,
            }}
          >
            {description}
          </p>
        )}
      </div>
      {track}
    </div>
  )
}
