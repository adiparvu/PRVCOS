"use client"

import React from "react"
import { clsx } from "clsx"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GlassTimeSlotPickerProps {
  /** Available slot labels (e.g. "08:00", "08:30"). */
  slots: string[]
  /** Selected slot. */
  value?: string | null
  onChange?: (slot: string) => void
  /** Slots that are taken/unavailable. */
  takenSlots?: string[]
  /** Min column width in px. Default 86. */
  minColWidth?: number
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassTimeSlotPicker({
  slots,
  value,
  onChange,
  takenSlots = [],
  minColWidth = 86,
  className,
  style,
}: GlassTimeSlotPickerProps) {
  const taken = new Set(takenSlots)

  return (
    <div
      className={clsx(className)}
      role="listbox"
      aria-label="Time slots"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${minColWidth}px, 1fr))`,
        gap: 8,
        ...style,
      }}
    >
      {slots.map((slot) => {
        const isTaken = taken.has(slot)
        const isSelected = slot === value

        return (
          <button
            key={slot}
            type="button"
            role="option"
            aria-selected={isSelected}
            aria-disabled={isTaken}
            disabled={isTaken}
            onClick={() => !isTaken && onChange?.(slot)}
            style={{
              padding: "11px 0",
              textAlign: "center",
              borderRadius: 11,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: isTaken ? "not-allowed" : "pointer",
              background: isSelected ? "var(--prv-accent, rgba(10,132,255,0.9))" : "var(--prv-g2)",
              border: `1px solid ${isSelected ? "var(--prv-accent, rgba(10,132,255,0.9))" : "var(--prv-border-subtle)"}`,
              color: isSelected ? "#fff" : "var(--prv-text-1)",
              opacity: isTaken ? 0.35 : 1,
              textDecoration: isTaken ? "line-through" : "none",
              transition: "background 150ms, border-color 150ms",
            }}
            onMouseEnter={(e) => {
              if (isTaken || isSelected) return
              ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g3)"
            }}
            onMouseLeave={(e) => {
              if (isSelected) return
              ;(e.currentTarget as HTMLButtonElement).style.background = "var(--prv-g2)"
            }}
          >
            {slot}
          </button>
        )
      })}
    </div>
  )
}
