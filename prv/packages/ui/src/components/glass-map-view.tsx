"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassMapViewProps {
  /** The actual map layer (tiles/embed) and any pins, rendered behind the chrome. */
  children?: React.ReactNode
  /** Show the floating zoom + recenter controls. Default true. */
  controls?: boolean
  onZoomIn?: () => void
  onZoomOut?: () => void
  onRecenter?: () => void
  /** Top-left status pill content. */
  badge?: React.ReactNode
  /** Bottom-left attribution text. Default "© OpenStreetMap". */
  attribution?: React.ReactNode
  height?: number | string
  className?: string
  style?: React.CSSProperties
}

// ── Control button ─────────────────────────────────────────────────────────────

function MapButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        borderRadius: 11,
        background: "rgba(22,22,22,0.6)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid var(--prv-border)",
        color: "var(--prv-text-1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: 18,
        transition: "background 150ms",
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = "rgba(40,40,40,0.8)"
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = "rgba(22,22,22,0.6)"
      }}
    >
      {children}
    </button>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassMapView({
  children,
  controls = true,
  onZoomIn,
  onZoomOut,
  onRecenter,
  badge,
  attribution = "© OpenStreetMap",
  height = 320,
  className,
  style,
}: GlassMapViewProps) {
  return (
    <div
      className={clsx(className)}
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: 16,
        overflow: "hidden",
        background: "#0c0c10",
        ...style,
      }}
    >
      {/* Map layer (tiles/embed + pins) */}
      {children}

      {/* Status badge */}
      {badge && (
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 13px",
            borderRadius: 100,
            background: "rgba(22,22,22,0.6)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--prv-border)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--prv-text-1)",
          }}
        >
          {badge}
        </div>
      )}

      {/* Floating controls */}
      {controls && (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <MapButton label="Zoom in" onClick={onZoomIn}>
            +
          </MapButton>
          <MapButton label="Zoom out" onClick={onZoomOut}>
            −
          </MapButton>
          <MapButton label="Recenter" onClick={onRecenter}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          </MapButton>
        </div>
      )}

      {/* Attribution */}
      {attribution && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 12,
            fontSize: 10,
            color: "var(--prv-text-4)",
          }}
        >
          {attribution}
        </div>
      )}
    </div>
  )
}
