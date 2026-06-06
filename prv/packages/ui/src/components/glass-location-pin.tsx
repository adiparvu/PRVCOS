"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type PinColor = "accent" | "green" | "red" | "amber" | "neutral"

export interface GlassLocationPinProps {
  color?: PinColor
  /** Show the expanding pulse ring (live location). */
  pulse?: boolean
  /** Text label shown below the pin. */
  label?: string
  /** Number shown inside the head (e.g. a cluster count). */
  count?: number
  /** Icon inside the head (overrides count). */
  icon?: React.ReactNode
  onClick?: () => void
  /** Absolute position within a relatively-positioned map container. */
  left?: number | string
  top?: number | string
  className?: string
  style?: React.CSSProperties
}

// ── Colors ────────────────────────────────────────────────────────────────────

const COLOR: Record<PinColor, string> = {
  accent: "var(--prv-accent, rgba(10,132,255,0.9))",
  green: "var(--prv-green, rgba(48,209,88,0.95))",
  red: "var(--prv-red, rgba(255,69,58,0.95))",
  amber: "var(--prv-amber, rgba(255,159,10,0.95))",
  neutral: "var(--prv-text-3)",
}

const KEYFRAMES = `@keyframes prvPinPulse{0%{transform:translate(-50%,-50%) scale(0.5);opacity:.5}100%{transform:translate(-50%,-50%) scale(2.4);opacity:0}}`

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassLocationPin({
  color = "accent",
  pulse = false,
  label,
  count,
  icon,
  onClick,
  left,
  top,
  className,
  style,
}: GlassLocationPinProps) {
  const bg = COLOR[color]
  const positioned = left !== undefined || top !== undefined

  const inner = icon ?? (count !== undefined ? <span>{count}</span> : null)

  return (
    <div
      className={clsx(className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={label}
      style={{
        position: positioned ? "absolute" : "relative",
        left,
        top,
        transform: "translate(-50%, -100%)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {pulse && <style>{KEYFRAMES}</style>}

      {pulse && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            width: 30,
            height: 30,
            borderRadius: "50%",
            transform: "translate(-50%,-50%)",
            background: bg,
            opacity: 0.4,
            animation: "prvPinPulse 2s ease-out infinite",
          }}
        />
      )}

      {/* Teardrop head */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50% 50% 50% 0",
          transform: "rotate(-45deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: bg,
          border: "2px solid rgba(255,255,255,0.85)",
          boxShadow: "0 6px 16px rgba(0,0,0,0.5)",
          position: "relative",
        }}
      >
        <span
          style={{
            transform: "rotate(45deg)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {inner}
        </span>
      </div>

      {label && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 34,
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            padding: "4px 9px",
            borderRadius: 8,
            background: "rgba(22,22,22,0.8)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid var(--prv-border)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--prv-text-1)",
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}
