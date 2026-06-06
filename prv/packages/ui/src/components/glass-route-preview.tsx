"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RouteStat {
  label: string
  value: React.ReactNode
}

export interface GlassRoutePreviewProps {
  /** SVG path `d` for the route line, drawn in a 0 0 600 240 viewBox. */
  path?: string
  /** Origin marker position (percent left/top within the map). */
  origin?: { left: string; top: string }
  /** Destination marker position (percent left/top). */
  destination?: { left: string; top: string }
  /** Stat tiles under the map. */
  stats: RouteStat[]
  /** Map area height. Default 240. */
  height?: number | string
  className?: string
  style?: React.CSSProperties
}

// ── Endpoint marker ────────────────────────────────────────────────────────────

function Endpoint({
  pos,
  color,
  glyph,
}: {
  pos: { left: string; top: string }
  color: string
  glyph: string
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: pos.left,
        top: pos.top,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50% 50% 50% 0",
          transform: "rotate(-45deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: color,
          border: "2px solid rgba(255,255,255,0.85)",
          boxShadow: "0 6px 16px rgba(0,0,0,0.5)",
        }}
      >
        <span
          style={{
            transform: "rotate(45deg)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {glyph}
        </span>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassRoutePreview({
  path = "M60 190 C 180 120, 260 200, 380 110 S 520 70, 540 60",
  origin = { left: "10%", top: "79%" },
  destination = { left: "90%", top: "25%" },
  stats,
  height = 240,
  className,
  style,
}: GlassRoutePreviewProps) {
  return (
    <div className={clsx(className)} style={style}>
      {/* Map area */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height,
          borderRadius: 16,
          overflow: "hidden",
          background:
            "radial-gradient(circle at 30% 20%, rgba(10,132,255,0.10), transparent 40%), #0c0c10",
        }}
      >
        {/* Grid */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "38px 38px",
          }}
        />

        {/* Route line */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 600 240"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0 }}
          aria-hidden="true"
        >
          <path
            d={path}
            fill="none"
            stroke="var(--prv-accent, rgba(10,132,255,0.9))"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="2 10"
          />
        </svg>

        <Endpoint pos={origin} color="var(--prv-green, rgba(48,209,88,0.95))" glyph="A" />
        <Endpoint pos={destination} color="var(--prv-red, rgba(255,69,58,0.95))" glyph="B" />
      </div>

      {/* Stats */}
      {stats.length > 0 && (
        <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
          {stats.map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--prv-g1)",
                border: "1px solid var(--prv-border-subtle)",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--prv-text-3)" }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 3 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
