"use client"

import React, { useEffect, useRef, useState } from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassDatePickerProps {
  value?: Date | null
  onChange: (date: Date | null) => void
  minDate?: Date
  maxDate?: Date
  placeholder?: string
  disabled?: boolean
  formatDate?: (date: Date) => string
  className?: string
  style?: React.CSSProperties
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

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

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

// Returns Mon-first index (0 = Monday … 6 = Sunday)
function firstWeekday(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function defaultFormat(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isOutOfRange(date: Date, minDate?: Date, maxDate?: Date) {
  if (minDate && date < minDate) return true
  if (maxDate && date > maxDate) return true
  return false
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CalIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ color: "var(--prv-text-3)", flexShrink: 0 }}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function ChevronLeft() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select date…",
  disabled = false,
  formatDate = defaultFormat,
  className,
  style,
}: GlassDatePickerProps) {
  const today = new Date()
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(value?.getFullYear() ?? today.getFullYear())
  const [month, setMonth] = useState(value?.getMonth() ?? today.getMonth())
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onDown)
    }
  }, [open])

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  const pick = (day: number) => {
    const date = new Date(year, month, day)
    if (isOutOfRange(date, minDate, maxDate)) return
    onChange(date)
    setOpen(false)
  }

  // Build grid
  const offset = firstWeekday(year, month)
  const count = daysInMonth(year, month)
  const prevCount = daysInMonth(year, month === 0 ? 11 : month - 1)
  const cells: { day: number; type: "prev" | "cur" | "next" }[] = []

  for (let i = offset - 1; i >= 0; i--) {
    cells.push({ day: prevCount - i, type: "prev" })
  }
  for (let d = 1; d <= count; d++) {
    cells.push({ day: d, type: "cur" })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, type: "next" })
  }

  return (
    <div ref={wrapperRef} className={clsx("relative inline-block", className)} style={style}>
      {/* trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-2 border focus-visible:outline-none"
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          background: open ? "var(--prv-g2)" : "var(--prv-g1)",
          borderColor: open ? "var(--prv-border)" : "var(--prv-border-subtle)",
          fontSize: 13,
          color: value ? "var(--prv-text-1)" : "var(--prv-text-4)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.45 : 1,
          transition: "background 150ms, border-color 150ms",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          if (!open && !disabled) e.currentTarget.style.background = "var(--prv-g2)"
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "var(--prv-g1)"
        }}
      >
        <CalIcon />
        {value ? formatDate(value) : placeholder}
      </button>

      {/* calendar panel */}
      <div
        aria-hidden={!open}
        className="absolute z-50 overflow-hidden border"
        style={{
          top: "calc(100% + 6px)",
          left: 0,
          width: 280,
          borderRadius: 18,
          background: "var(--prv-g2)",
          borderColor: "var(--prv-border-subtle)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.3)",
          backdropFilter: "blur(32px) saturate(160%)",
          WebkitBackdropFilter: "blur(32px) saturate(160%)",
          transformOrigin: "top left",
          transform: open ? "scale(1) translateY(0)" : "scale(0.95) translateY(-6px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "transform 220ms cubic-bezier(0.34,1.56,0.64,1), opacity 160ms ease",
        }}
      >
        {/* month nav */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <button
            onClick={prevMonth}
            className="flex items-center justify-center rounded-lg border focus-visible:outline-none"
            style={{
              width: 28,
              height: 28,
              background: "none",
              borderColor: "var(--prv-border-subtle)",
              color: "var(--prv-text-2)",
              cursor: "pointer",
              transition: "background 120ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--prv-g3)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none"
            }}
          >
            <ChevronLeft />
          </button>

          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--prv-text-1)",
            }}
          >
            {MONTHS[month]} {year}
          </span>

          <button
            onClick={nextMonth}
            className="flex items-center justify-center rounded-lg border focus-visible:outline-none"
            style={{
              width: 28,
              height: 28,
              background: "none",
              borderColor: "var(--prv-border-subtle)",
              color: "var(--prv-text-2)",
              cursor: "pointer",
              transition: "background 120ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--prv-g3)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none"
            }}
          >
            <ChevronRight />
          </button>
        </div>

        {/* weekday headers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            padding: "0 8px",
          }}
        >
          {DAYS.map((d) => (
            <div
              key={d}
              style={{
                textAlign: "center",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--prv-text-4)",
                padding: "4px 0",
                letterSpacing: "0.04em",
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* day grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            padding: "4px 8px 12px",
            gap: 2,
          }}
        >
          {cells.map((cell, i) => {
            if (cell.type !== "cur") {
              return (
                <div
                  key={i}
                  style={{
                    aspectRatio: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "var(--prv-text-4)",
                    borderRadius: 8,
                    opacity: 0.4,
                  }}
                >
                  {cell.day}
                </div>
              )
            }

            const date = new Date(year, month, cell.day)
            const isToday = isSameDay(date, today)
            const isSelected = value ? isSameDay(date, value) : false
            const isDisabled = isOutOfRange(date, minDate, maxDate)

            return (
              <button
                key={i}
                type="button"
                onClick={() => pick(cell.day)}
                disabled={isDisabled}
                className="focus-visible:outline-none"
                style={{
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "none",
                  background: isSelected ? "var(--prv-text-1)" : "transparent",
                  color: isSelected ? "#000" : isToday ? "#0a84ff" : "var(--prv-text-2)",
                  fontWeight: isSelected ? 600 : isToday ? 700 : 400,
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  opacity: isDisabled ? 0.3 : 1,
                  fontFamily: "inherit",
                  position: "relative",
                  transition: "background 100ms, color 100ms",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected && !isDisabled) {
                    e.currentTarget.style.background = "var(--prv-g3)"
                    e.currentTarget.style.color = "var(--prv-text-1)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent"
                    e.currentTarget.style.color = isToday ? "#0a84ff" : "var(--prv-text-2)"
                  }
                }}
              >
                {cell.day}
                {isToday && !isSelected && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 3,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "#0a84ff",
                    }}
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
