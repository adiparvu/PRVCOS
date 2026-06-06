"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type GeofenceStatus = "inside" | "outside"

export interface GeofenceRow {
  label: string
  value: React.ReactNode
}

export interface GlassGeofenceCardProps {
  name: string
  /** Sub-line under the name (address / zone type). */
  address?: string
  status: GeofenceStatus
  /** Status pill text. Defaults derived from status. */
  statusLabel?: React.ReactNode
  /** Leading icon. */
  icon?: React.ReactNode
  /** Detail rows shown below the mini-map. */
  rows?: GeofenceRow[]
  /** Show the radius mini-map. Default true. */
  showMiniMap?: boolean
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassGeofenceCard({
  name,
  address,
  status,
  statusLabel,
  icon,
  rows = [],
  showMiniMap = true,
  onClick,
  className,
  style,
}: GlassGeofenceCardProps) {
  const inside = status === "inside"
  const accent = "var(--prv-accent, rgba(10,132,255,0.9))"
  const green = "var(--prv-green, rgba(48,209,88,0.95))"

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

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "var(--prv-g2)",
            border: "1px solid var(--prv-border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accent,
            flexShrink: 0,
          }}
        >
          {icon ?? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-1)" }}>{name}</div>
          {address && <div style={{ fontSize: 12, color: "var(--prv-text-3)" }}>{address}</div>}
        </div>

        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 9px",
            borderRadius: 100,
            background: inside ? "rgba(48,209,88,0.14)" : "var(--prv-g2)",
            color: inside ? green : "var(--prv-text-3)",
            flexShrink: 0,
          }}
        >
          {inside && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: green,
              }}
            />
          )}
          {statusLabel ?? (inside ? "Inside" : "Outside")}
        </span>
      </div>

      {/* Mini radius map */}
      {showMiniMap && (
        <div
          aria-hidden="true"
          style={{
            height: 70,
            borderRadius: 10,
            marginBottom: rows.length ? 10 : 0,
            position: "relative",
            overflow: "hidden",
            background: inside
              ? "radial-gradient(circle at 50% 50%, rgba(10,132,255,0.18), transparent 60%), #0c0c10"
              : "#0c0c10",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 54,
              height: 54,
              borderRadius: "50%",
              transform: "translate(-50%,-50%)",
              border: `2px dashed ${inside ? "rgba(10,132,255,0.6)" : "var(--prv-text-3)"}`,
              background: inside ? "rgba(10,132,255,0.08)" : "rgba(255,255,255,0.04)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: inside ? "50%" : "64%",
              top: inside ? "50%" : "38%",
              width: 8,
              height: 8,
              borderRadius: "50%",
              transform: "translate(-50%,-50%)",
              background: inside ? accent : "var(--prv-text-3)",
            }}
          />
        </div>
      )}

      {/* Rows */}
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            padding: "6px 0",
            borderTop: "1px solid var(--prv-border-subtle)",
          }}
        >
          <span style={{ color: "var(--prv-text-3)" }}>{row.label}</span>
          <span style={{ color: "var(--prv-text-1)" }}>{row.value}</span>
        </div>
      ))}
    </div>
  )
}
