"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type Availability = "yes" | "maybe" | "no"

export interface GlassAvailabilityGridProps {
  /** Row labels (people / resources). */
  people: string[]
  /** Column labels (days / periods). */
  days: string[]
  /**
   * Availability state keyed by "row-col" (e.g. "0-3"). Missing keys render as "no".
   */
  value: Record<string, Availability>
  /** Fired with the next cycled state when a cell is tapped. */
  onChange?: (row: number, col: number, next: Availability) => void
  /** Show the legend. Default true. */
  showLegend?: boolean
  /** Label-column width in px. Default 90. */
  labelWidth?: number
  className?: string
  style?: React.CSSProperties
}

// ── Cycle + colors ─────────────────────────────────────────────────────────────

const CYCLE: Record<Availability, Availability> = {
  yes: "maybe",
  maybe: "no",
  no: "yes",
}

function cellColor(state: Availability): string {
  if (state === "yes") return "rgba(48,209,88,0.7)"
  if (state === "maybe") return "rgba(255,159,10,0.6)"
  return "var(--prv-g2)"
}

const LEGEND: Array<{ state: Availability; label: string }> = [
  { state: "yes", label: "Available" },
  { state: "maybe", label: "Maybe" },
  { state: "no", label: "Unavailable" },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassAvailabilityGrid({
  people,
  days,
  value,
  onChange,
  showLegend = true,
  labelWidth = 90,
  className,
  style,
}: GlassAvailabilityGridProps) {
  const stateAt = (r: number, c: number): Availability => value[`${r}-${c}`] ?? "no"

  return (
    <div className={clsx(className)} style={style}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${labelWidth}px repeat(${days.length}, 1fr)`,
          gap: 5,
        }}
      >
        {/* Header row */}
        <div />
        {days.map((d, i) => (
          <div
            key={`h-${i}`}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--prv-text-3)",
              textAlign: "center",
              paddingBottom: 4,
            }}
          >
            {d}
          </div>
        ))}

        {/* Rows */}
        {people.map((person, r) => (
          <React.Fragment key={`r-${r}`}>
            <div
              style={{
                fontSize: 12,
                color: "var(--prv-text-2)",
                display: "flex",
                alignItems: "center",
              }}
            >
              {person}
            </div>
            {days.map((_, c) => {
              const state = stateAt(r, c)
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  aria-label={`${person}, ${days[c]}: ${state}`}
                  onClick={() => onChange?.(r, c, CYCLE[state])}
                  style={{
                    height: 30,
                    borderRadius: 7,
                    border: "none",
                    cursor: onChange ? "pointer" : "default",
                    background: cellColor(state),
                    transition: "transform 120ms",
                  }}
                  onMouseEnter={(e) => {
                    if (!onChange) return
                    ;(e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"
                  }}
                />
              )
            })}
          </React.Fragment>
        ))}
      </div>

      {showLegend && (
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 16,
            fontSize: 12,
            color: "var(--prv-text-3)",
          }}
        >
          {LEGEND.map((l) => (
            <span key={l.state} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: 4,
                  background: cellColor(l.state),
                }}
              />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
