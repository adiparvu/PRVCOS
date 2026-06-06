"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ShiftStatus = "confirmed" | "open" | "draft"

export interface ShiftAssignee {
  /** Initials or short label. Empty/undefined renders an open "?" slot. */
  initials?: string
}

export interface ShiftMeta {
  icon?: React.ReactNode
  label: string
}

export interface GlassShiftCardProps {
  role: string
  /** Time range string (e.g. "08:00 – 16:00"). */
  time: string
  /** Duration label (e.g. "8h"). */
  duration?: string
  /** Meta chips (location, break, etc.). */
  meta?: ShiftMeta[]
  assignees?: ShiftAssignee[]
  status?: ShiftStatus
  /** Custom status label (overrides default). */
  statusLabel?: React.ReactNode
  /** Left stripe color. */
  color?: string
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

// ── Status styling ─────────────────────────────────────────────────────────────

function statusStyle(status: ShiftStatus): {
  bg: string
  color: string
  label: string
} {
  if (status === "confirmed")
    return {
      bg: "rgba(48,209,88,0.14)",
      color: "var(--prv-green, rgba(48,209,88,0.95))",
      label: "Confirmed",
    }
  if (status === "open")
    return {
      bg: "rgba(255,159,10,0.14)",
      color: "var(--prv-amber, rgba(255,159,10,0.95))",
      label: "Open",
    }
  return {
    bg: "var(--prv-g2)",
    color: "var(--prv-text-3)",
    label: "Draft",
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassShiftCard({
  role,
  time,
  duration,
  meta = [],
  assignees = [],
  status = "confirmed",
  statusLabel,
  color = "var(--prv-accent, rgba(10,132,255,0.9))",
  onClick,
  className,
  style,
}: GlassShiftCardProps) {
  const st = statusStyle(status)

  return (
    <div
      className={clsx("relative", className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      style={{
        padding: 16,
        borderRadius: 16,
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        position: "relative",
        display: "flex",
        gap: 14,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {/* Top specular edge */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0 0 auto",
          height: 1,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Color stripe */}
      <div
        aria-hidden="true"
        style={{
          width: 4,
          borderRadius: 100,
          background: color,
          flexShrink: 0,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Status pill */}
        <span
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 6,
            textTransform: "uppercase",
            background: st.bg,
            color: st.color,
          }}
        >
          {statusLabel ?? st.label}
        </span>

        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-1)" }}>{role}</div>
        <div style={{ fontSize: 13, color: "var(--prv-text-2)", marginTop: 2 }}>
          {time}
          {duration && <> · {duration}</>}
        </div>

        {meta.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 14,
              marginTop: 12,
              fontSize: 12,
              color: "var(--prv-text-3)",
              flexWrap: "wrap",
            }}
          >
            {meta.map((m, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                {m.icon}
                {m.label}
              </span>
            ))}
          </div>
        )}

        {assignees.length > 0 && (
          <div style={{ display: "flex", marginTop: 12 }}>
            {assignees.map((a, i) => {
              const open = !a.initials
              return (
                <span
                  key={i}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    border: `2px ${open ? "dashed" : "solid"} var(--prv-bg, #000)`,
                    background: open ? "var(--prv-g1)" : "var(--prv-g3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--prv-text-2)",
                    marginLeft: i === 0 ? 0 : -7,
                  }}
                >
                  {a.initials ?? "?"}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
