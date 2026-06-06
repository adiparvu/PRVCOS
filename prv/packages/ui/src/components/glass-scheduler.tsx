"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SchedulerDay {
  label: string
  /** Optional day number shown below the label. */
  date?: number | string
  /** Highlight as today. */
  today?: boolean
}

export interface SchedulerShift {
  id: string
  /** Column index (0-based) into `days`. */
  day: number
  /** Start hour (24h). */
  start: number
  /** End hour (24h). */
  end: number
  label: string
  /** Bar color. */
  color?: string
}

export interface GlassSchedulerProps {
  days: SchedulerDay[]
  shifts: SchedulerShift[]
  /** First hour shown. Default 8. */
  startHour?: number
  /** Last hour shown (exclusive grid line). Default 18. */
  endHour?: number
  /** Hours per row. Default 2. */
  step?: number
  /** Row height in px. Default 52. */
  rowHeight?: number
  onShiftClick?: (shift: SchedulerShift) => void
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassScheduler({
  days,
  shifts,
  startHour = 8,
  endHour = 18,
  step = 2,
  rowHeight = 52,
  onShiftClick,
  className,
  style,
}: GlassSchedulerProps) {
  const hours: number[] = []
  for (let h = startHour; h <= endHour; h += step) hours.push(h)

  const pxPerHour = rowHeight / step

  return (
    <div className={clsx(className)} style={{ overflowX: "auto", ...style }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `60px repeat(${days.length}, minmax(90px, 1fr))`,
          minWidth: 60 + days.length * 90,
        }}
      >
        {/* Header row */}
        <div />
        {days.map((d, i) => (
          <div
            key={i}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--prv-text-3)",
              textAlign: "center",
              padding: "8px 0",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {d.label}
            {d.date !== undefined && (
              <span
                style={{
                  display: "block",
                  fontSize: 15,
                  fontWeight: 700,
                  marginTop: 2,
                  color: d.today ? "var(--prv-accent, rgba(10,132,255,0.9))" : "var(--prv-text-1)",
                }}
              >
                {d.date}
              </span>
            )}
          </div>
        ))}

        {/* Time rows */}
        {hours.map((hr) => (
          <React.Fragment key={hr}>
            <div
              style={{
                fontSize: 11,
                color: "var(--prv-text-4)",
                textAlign: "right",
                padding: "0 8px",
                height: rowHeight,
              }}
            >
              {hr}:00
            </div>
            {days.map((_, dy) => (
              <div
                key={`${hr}-${dy}`}
                style={{
                  height: rowHeight,
                  borderTop: "1px solid var(--prv-border-subtle)",
                  borderLeft: "1px solid var(--prv-border-subtle)",
                  position: "relative",
                }}
              >
                {shifts
                  .filter((s) => s.day === dy && s.start === hr)
                  .map((s) => {
                    const color = s.color ?? "var(--prv-accent, rgba(10,132,255,0.9))"
                    const heightPx = (s.end - s.start) * pxPerHour - 4
                    return (
                      <div
                        key={s.id}
                        role={onShiftClick ? "button" : undefined}
                        onClick={() => onShiftClick?.(s)}
                        style={{
                          position: "absolute",
                          left: 3,
                          right: 3,
                          top: 2,
                          height: heightPx,
                          borderRadius: 8,
                          padding: "5px 7px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#fff",
                          overflow: "hidden",
                          cursor: onShiftClick ? "pointer" : "default",
                          background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                        }}
                      >
                        {s.label}
                        <div style={{ fontSize: 10, opacity: 0.85, fontWeight: 500 }}>
                          {s.start}:00–{s.end}:00
                        </div>
                      </div>
                    )
                  })}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
