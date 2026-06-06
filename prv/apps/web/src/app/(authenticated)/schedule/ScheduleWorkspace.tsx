"use client"

import { useState } from "react"
import {
  GlassScheduler,
  GlassShiftCard,
  GlassTimeSlotPicker,
  GlassAvailabilityGrid,
  type SchedulerDay,
  type SchedulerShift,
  type Availability,
} from "@prv/ui"

// ── Placeholder data ──────────────────────────────────────────────────────────
// No scheduling backend exists yet; this workspace assembles the Sprint 33
// components with static data + working local interactivity.

const DAYS: SchedulerDay[] = [
  { label: "Mon", date: 9 },
  { label: "Tue", date: 10 },
  { label: "Wed", date: 11, today: true },
  { label: "Thu", date: 12 },
  { label: "Fri", date: 13 },
  { label: "Sat", date: 14 },
  { label: "Sun", date: 15 },
]

const ACCENT = "rgba(10,132,255,0.9)"
const GREEN = "rgba(48,209,88,0.95)"
const PURPLE = "rgba(191,90,242,0.95)"
const AMBER = "rgba(255,159,10,0.95)"

const SHIFTS: SchedulerShift[] = [
  { id: "s1", day: 0, start: 8, end: 12, label: "Sales", color: ACCENT },
  { id: "s2", day: 2, start: 8, end: 16, label: "Manager", color: GREEN },
  { id: "s3", day: 3, start: 10, end: 14, label: "Cashier", color: PURPLE },
  { id: "s4", day: 5, start: 16, end: 18, label: "Stock", color: AMBER },
]

const AVAIL_PEOPLE = ["Andrei", "Maria", "Radu", "Elena"]
const AVAIL_DAYS = ["M", "T", "W", "T", "F", "S", "S"]

// Seed availability: key "row-col" → state.
const INITIAL_AVAIL: Record<string, Availability> = (() => {
  const seed: Availability[][] = [
    ["yes", "yes", "yes", "maybe", "yes", "no", "no"],
    ["yes", "maybe", "yes", "yes", "yes", "yes", "no"],
    ["maybe", "yes", "yes", "no", "yes", "maybe", "no"],
    ["yes", "yes", "no", "yes", "maybe", "no", "no"],
  ]
  const map: Record<string, Availability> = {}
  seed.forEach((row, r) => row.forEach((v, c) => (map[`${r}-${c}`] = v)))
  return map
})()

const SLOTS = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]
const TAKEN_SLOTS = ["08:30", "10:30"]

// ── Section label ─────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mx-1 mt-6 mb-2.5">
      {children}
    </p>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[18px] p-4 relative"
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
      }}
    >
      {children}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ScheduleWorkspace({ storeName }: { storeName: string }) {
  const [slot, setSlot] = useState<string | null>("09:00")
  const [avail, setAvail] = useState<Record<string, Availability>>(INITIAL_AVAIL)

  return (
    <div className="px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white/35 text-[13px] font-medium mb-0.5">PRV · {storeName}</p>
          <h1 className="text-white/90 text-[26px] font-semibold tracking-tight">Schedule</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous week"
            className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white/65"
            style={{ background: "var(--prv-g2)", border: "1px solid var(--prv-border-subtle)" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-[13px] font-semibold text-white/65">Jun 9–15</span>
          <button
            type="button"
            aria-label="Next week"
            className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white/65"
            style={{ background: "var(--prv-g2)", border: "1px solid var(--prv-border-subtle)" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Week scheduler */}
      <div
        className="rounded-[20px] overflow-hidden relative"
        style={{ background: "var(--prv-g1)", border: "1px solid var(--prv-border-subtle)" }}
      >
        <GlassScheduler
          days={DAYS}
          shifts={SHIFTS}
          startHour={8}
          endHour={16}
          step={2}
          rowHeight={48}
        />
      </div>

      {/* This week's shifts */}
      <Label>This week&apos;s shifts</Label>
      <div className="flex flex-col gap-2.5">
        <GlassShiftCard
          role="Morning · Sales Floor"
          time="Wed · 08:00–16:00"
          duration="8h"
          status="confirmed"
          color={ACCENT}
          meta={[{ label: "📍 Cluj · Main" }, { label: "☕ 1h break" }]}
          assignees={[{ initials: "AP" }, { initials: "MI" }, { initials: "RD" }]}
        />
        <GlassShiftCard
          role="Evening · Warehouse"
          time="Sat · 16:00–00:00"
          duration="8h"
          status="open"
          statusLabel="2 open"
          color={AMBER}
          meta={[{ label: "📍 Bucharest" }, { label: "🌙 Night rate" }]}
          assignees={[{ initials: "VG" }, {}, {}]}
        />
      </div>

      {/* Quick assign — time slot picker */}
      <Label>Assign a slot · Thu Jun 12</Label>
      <Card>
        <GlassTimeSlotPicker
          slots={SLOTS}
          value={slot}
          onChange={setSlot}
          takenSlots={TAKEN_SLOTS}
        />
      </Card>

      {/* Team availability */}
      <Label>Team availability</Label>
      <Card>
        <GlassAvailabilityGrid
          people={AVAIL_PEOPLE}
          days={AVAIL_DAYS}
          value={avail}
          onChange={(r, c, next) => setAvail((prev) => ({ ...prev, [`${r}-${c}`]: next }))}
        />
      </Card>
    </div>
  )
}
