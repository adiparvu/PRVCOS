"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type StatusKind = "online" | "away" | "busy" | "offline"
export type StatusDotSize = "sm" | "md" | "lg"
export type StatusDotVariant = "dot" | "pill"

export interface GlassStatusDotProps {
  status: StatusKind
  /** Show an expanding pulse ring. Default false. */
  pulse?: boolean
  /** Text label. Renders beside the dot, or inside the pill for variant="pill". */
  label?: string
  size?: StatusDotSize
  variant?: StatusDotVariant
  className?: string
  style?: React.CSSProperties
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOR: Record<StatusKind, string> = {
  online: "var(--prv-green, rgba(48,209,88,0.95))",
  away: "var(--prv-amber, rgba(255,159,10,0.95))",
  busy: "var(--prv-red, rgba(255,69,58,0.95))",
  offline: "var(--prv-text-3)",
}

const DOT_PX: Record<StatusDotSize, number> = { sm: 8, md: 10, lg: 13 }

const KEYFRAMES = `@keyframes prvStatusPulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.6);opacity:0}}`

// ── Dot primitive ─────────────────────────────────────────────────────────────

function Dot({ status, size, pulse }: { status: StatusKind; size: StatusDotSize; pulse: boolean }) {
  const px = DOT_PX[size]
  const color = COLOR[status]
  // Offline never pulses (no live activity to convey).
  const showPulse = pulse && status !== "offline"
  return (
    <span
      style={{
        width: px,
        height: px,
        borderRadius: "50%",
        background: color,
        position: "relative",
        flexShrink: 0,
        display: "inline-block",
      }}
    >
      {showPulse && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: color,
            animation: "prvStatusPulse 1.8s ease-out infinite",
          }}
        />
      )}
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassStatusDot({
  status,
  pulse = false,
  label,
  size = "md",
  variant = "dot",
  className,
  style,
}: GlassStatusDotProps) {
  const a11yLabel = label ?? status

  if (variant === "pill") {
    return (
      <span
        className={clsx(className)}
        role="status"
        aria-label={a11yLabel}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "5px 12px 5px 10px",
          borderRadius: 100,
          background: "var(--prv-g2)",
          border: "1px solid var(--prv-border-subtle)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--prv-text-1)",
          ...style,
        }}
      >
        <style>{KEYFRAMES}</style>
        <Dot status={status} size={size} pulse={pulse} />
        {label}
      </span>
    )
  }

  return (
    <span
      className={clsx(className)}
      role="status"
      aria-label={a11yLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        fontSize: 13,
        color: "var(--prv-text-2)",
        ...style,
      }}
    >
      <style>{KEYFRAMES}</style>
      <Dot status={status} size={size} pulse={pulse} />
      {label}
    </span>
  )
}
