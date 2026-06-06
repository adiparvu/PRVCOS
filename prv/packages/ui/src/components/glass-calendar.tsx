"use client"

import React, { useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export type CalendarMode = "single" | "range"

/** A date range. `end` is null while the user is mid-selection. */
export interface DateRange {
  start: string
  end: string | null
}

export interface GlassCalendarProps {
  mode?: CalendarMode
  /** ISO "YYYY-MM-DD" for single mode, DateRange for range mode. */
  value?: string | DateRange | null
  onChange?: (value: string | DateRange | null) => void
  /** ISO dates that should render an event dot. */
  events?: string[]
  /** Inclusive bounds; dates outside are disabled. */
  minDate?: string
  maxDate?: string
  /** Controls which month is shown initially (ISO date). Defaults to today. */
  defaultMonth?: string
  /** Show the Today / Clear footer. */
  showFooter?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Date helpers (UTC-safe, no external deps) ──────────────────────────────────

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]
const DOW = ["S", "M", "T", "W", "T", "F", "S"]

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function toKey(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

function todayKey(): string {
  const t = new Date()
  return toKey(t.getFullYear(), t.getMonth(), t.getDate())
}

function parseKey(key: string): { y: number; m: number; d: number } {
  const parts = key.split("-")
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  return { y, m: m - 1, d }
}

/** Lexicographic comparison works for ISO YYYY-MM-DD strings. */
function lte(a: string, b: string): boolean {
  return a <= b
}

function isRange(v: GlassCalendarProps["value"]): v is DateRange {
  return !!v && typeof v === "object" && "start" in v
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassCalendar({
  mode = "single",
  value,
  onChange,
  events = [],
  minDate,
  maxDate,
  defaultMonth,
  showFooter = true,
  className,
  style,
}: GlassCalendarProps) {
  const initial = parseKey(defaultMonth ?? todayKey())
  const [viewY, setViewY] = useState(initial.y)
  const [viewM, setViewM] = useState(initial.m)

  const eventSet = React.useMemo(() => new Set(events), [events])
  const today = todayKey()

  const single = mode === "single" && typeof value === "string" ? value : null
  const range = mode === "range" && isRange(value) ? value : null

  const isDisabled = (key: string): boolean => {
    if (minDate && !lte(minDate, key)) return true
    if (maxDate && !lte(key, maxDate)) return true
    return false
  }

  const cellState = (key: string) => {
    if (single) {
      return { selected: key === single }
    }
    if (range) {
      const { start, end } = range
      if (!end) return { selected: key === start, rangeStart: key === start }
      const lo = lte(start, end) ? start : end
      const hi = lte(start, end) ? end : start
      return {
        rangeStart: key === lo,
        rangeEnd: key === hi,
        inRange: lte(lo, key) && lte(key, hi) && key !== lo && key !== hi,
        selected: key === lo || key === hi,
      }
    }
    return {}
  }

  const handlePick = (key: string) => {
    if (isDisabled(key)) return
    if (mode === "single") {
      onChange?.(key)
      return
    }
    // range mode
    if (!range || range.end !== null) {
      // start a new range
      onChange?.({ start: key, end: null })
    } else {
      // complete the range, normalizing order
      const start = range.start
      const next: DateRange = lte(start, key) ? { start, end: key } : { start: key, end: start }
      onChange?.(next)
    }
  }

  const move = (dir: number) => {
    let m = viewM + dir
    let y = viewY
    if (m < 0) {
      m = 11
      y--
    } else if (m > 11) {
      m = 0
      y++
    }
    setViewM(m)
    setViewY(y)
  }

  const goToday = () => {
    const t = parseKey(today)
    setViewY(t.y)
    setViewM(t.m)
    if (mode === "single") onChange?.(today)
  }

  const clear = () => onChange?.(null)

  // Build the grid cells
  const firstDow = new Date(viewY, viewM, 1).getDay()
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate()
  const prevMonthDays = new Date(viewY, viewM, 0).getDate()

  type Cell = { day: number; key?: string; muted: boolean }
  const cells: Cell[] = []
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, muted: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, key: toKey(viewY, viewM, d), muted: false })
  }
  const trailing = (7 - (cells.length % 7)) % 7
  for (let d = 1; d <= trailing; d++) {
    cells.push({ day: d, muted: true })
  }

  return (
    <div
      className={clsx("relative overflow-hidden", className)}
      style={{
        width: 320,
        padding: 18,
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 20,
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
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--prv-text-1)" }}>
          {MONTHS[viewM]} {viewY}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <NavBtn label="Previous month" onClick={() => move(-1)} dir="prev" />
          <NavBtn label="Next month" onClick={() => move(1)} dir="next" />
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
        }}
      >
        {DOW.map((d, i) => (
          <div
            key={`dow-${i}`}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--prv-text-4)",
              textAlign: "center",
              padding: "6px 0",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {d}
          </div>
        ))}

        {cells.map((cell, i) => {
          if (cell.muted || !cell.key) {
            return (
              <div
                key={`c-${i}`}
                style={{ ...CELL_BASE, color: "var(--prv-text-4)" }}
                aria-hidden="true"
              >
                {cell.day}
              </div>
            )
          }
          const key = cell.key
          const st = cellState(key)
          const disabled = isDisabled(key)
          const isToday = key === today

          let radius = 9
          let background = "transparent"
          let color = "var(--prv-text-1)"
          let fontWeight = 400
          if (st.inRange) {
            background = "rgba(10,132,255,0.14)"
            radius = 0
          }
          if (st.selected) {
            background = "var(--prv-accent, rgba(10,132,255,0.9))"
            color = "#fff"
            fontWeight = 700
            if (st.rangeStart && !st.rangeEnd) radius = 9
            else if (st.rangeEnd && !st.rangeStart) radius = 9
          }

          return (
            <button
              key={`c-${i}`}
              type="button"
              disabled={disabled}
              aria-pressed={st.selected}
              aria-current={isToday ? "date" : undefined}
              onClick={() => handlePick(key)}
              style={{
                ...CELL_BASE,
                position: "relative",
                background,
                color: disabled ? "var(--prv-text-4)" : color,
                fontWeight,
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.4 : 1,
                border: isToday ? "1px solid var(--prv-border)" : "1px solid transparent",
                borderRadius: radius,
                transition: "background 130ms, border-color 130ms",
              }}
              onMouseEnter={(e) => {
                if (disabled || st.selected) return
                ;(e.currentTarget as HTMLButtonElement).style.background = st.inRange
                  ? "rgba(10,132,255,0.2)"
                  : "var(--prv-g2)"
              }}
              onMouseLeave={(e) => {
                if (disabled || st.selected) return
                ;(e.currentTarget as HTMLButtonElement).style.background = background
              }}
            >
              {cell.day}
              {eventSet.has(key) && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    bottom: 4,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: st.selected ? "#fff" : "var(--prv-accent, rgba(10,132,255,0.9))",
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      {showFooter && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid var(--prv-border-subtle)",
          }}
        >
          <button
            type="button"
            onClick={goToday}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 9,
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: "var(--prv-g2)",
              border: "1px solid var(--prv-border-subtle)",
              color: "var(--prv-text-2)",
              transition: "background 150ms",
            }}
          >
            Today
          </button>
          <button
            type="button"
            onClick={clear}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 9,
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: "var(--prv-text-1)",
              border: "1px solid transparent",
              color: "#000",
              transition: "background 150ms",
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

// ── Sub-pieces ────────────────────────────────────────────────────────────────

const CELL_BASE: React.CSSProperties = {
  aspectRatio: "1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  borderRadius: 9,
}

function NavBtn({
  label,
  onClick,
  dir,
}: {
  label: string
  onClick: () => void
  dir: "prev" | "next"
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        background: "var(--prv-g2)",
        border: "1px solid var(--prv-border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--prv-text-2)",
        cursor: "pointer",
        transition: "background 150ms",
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g3)"
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g2)"
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {dir === "prev" ? (
          <polyline points="15 18 9 12 15 6" />
        ) : (
          <polyline points="9 18 15 12 9 6" />
        )}
      </svg>
    </button>
  )
}
