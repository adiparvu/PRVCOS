"use client"

import { useState, useMemo } from "react"
import {
  GlassShiftCard,
  GlassTimeSlotPicker,
  GlassAvailabilityGrid,
  type Availability,
} from "@prv/ui"
import { useShifts, useTimeOffRequests } from "@/lib/api-hooks"
import type { ShiftSummary } from "@/app/api/schedule/route"
import type { TimeOffRequest } from "@/app/api/people/time-off/route"

// ── Semantic status colors ────────────────────────────────────────────────────
const BLUE = "rgba(10,132,255,0.9)"
const GREEN = "rgba(48,209,88,0.95)"
const PURPLE = "rgba(191,90,242,0.95)"
const AMBER = "rgba(255,159,10,0.95)"
const RED = "rgba(255,69,58,0.9)"

// ── CSS variable shorthands ───────────────────────────────────────────────────
const g1 = "var(--prv-g1)"
const g2 = "var(--prv-g2)"
const bds = "var(--prv-border-subtle)"
const bd = "var(--prv-border)"
const t1 = "var(--prv-text-1)"
const t2 = "var(--prv-text-2)"
const t3 = "var(--prv-text-3)"

// ── Local types ───────────────────────────────────────────────────────────────

interface ShiftData {
  id: string
  role: string
  day: string
  time: string
  duration: string
  status: "confirmed" | "open" | "draft"
  statusLabel?: string
  color: string
  location: string
  rate: string
  metaLabels: string[]
  assignees: { initials: string }[]
  openSlots?: number
  suitableFor?: string
}

interface LeaveRequest {
  id: string
  initials: string
  name: string
  type: string
  dates: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shiftColor(status: string): string {
  if (status === "open") return AMBER
  if (status === "confirmed") return BLUE
  if (status === "scheduled") return GREEN
  return PURPLE
}

function mapStatus(status: string): "confirmed" | "open" | "draft" {
  if (status === "open") return "open"
  if (status === "confirmed") return "confirmed"
  return "draft"
}

function mapShift(s: ShiftSummary): ShiftData {
  const color = shiftColor(s.status)
  const locStr = s.site ? `${s.location} · ${s.site}` : s.location
  const meta: string[] = [`📍 ${locStr}`]
  if (s.openSlots > 0) meta.push(`${s.openSlots} slot${s.openSlots > 1 ? "s" : ""} open`)

  return {
    id: s.id,
    role: s.roleLabel,
    day: s.dayLabel,
    time: `${s.startTime}–${s.endTime}`,
    duration: `${s.durationHours}h`,
    status: mapStatus(s.status),
    statusLabel: s.openSlots > 0 ? `${s.openSlots} Open` : undefined,
    color,
    location: locStr,
    rate: "Standard",
    metaLabels: meta,
    assignees: s.assignees.map((a) => ({ initials: a.initials })),
    openSlots: s.openSlots > 0 ? s.openSlots : undefined,
    suitableFor: s.openSlots > 0 ? s.roleLabel : undefined,
  }
}

function mapLeave(r: TimeOffRequest): LeaveRequest {
  const end = r.endDate ?? r.startDate
  const dateStr = r.startDate === end ? r.startDate : `${r.startDate}–${end}`
  return {
    id: r.id,
    initials: r.employeeInitials,
    name: r.employeeName,
    type: r.typeLabel,
    dates: `${dateStr} · ${r.workingDays} day${r.workingDays !== 1 ? "s" : ""}`,
  }
}

// ── Fallback / config data ────────────────────────────────────────────────────
// Pre-load fallbacks for the availability grid (real people + states arrive
// from /api/schedule); the slot grid is fixed bookable working hours.

const AVAIL_PEOPLE = ["—", "—", "—", "—"]
const AVAIL_DAYS = ["M", "T", "W", "T", "F", "S", "S"]

const INITIAL_AVAIL: Record<string, Availability> = {}

const SLOTS = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-widest mx-1 mt-5 mb-2.5"
      style={{ color: t3 }}
    >
      {children}
    </p>
  )
}

function ShiftDetailSheet({ shift, onClose }: { shift: ShiftData | null; onClose: () => void }) {
  if (!shift) return null
  const isOpen = shift.status === "open"

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 55,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 16px 28px",
        animation: "prvFadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          animation: "prvSlideUp 0.32s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 24,
            background: g2,
            border: `1px solid ${bd}`,
            backdropFilter: "blur(48px)",
            WebkitBackdropFilter: "blur(48px)",
            boxShadow: "var(--prv-shadow-e4)",
          }}
        >
          <div
            style={{
              position: "absolute",
              insetInline: 0,
              top: 0,
              height: 1,
              background: "var(--prv-g2-spec)",
            }}
          />
          <div
            style={{ width: 36, height: 4, borderRadius: 2, background: bd, margin: "12px auto 0" }}
          />

          <div style={{ padding: "16px 20px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  flexShrink: 0,
                  background: shift.color.replace("0.9", "0.15").replace("0.95", "0.15"),
                  border: `1px solid ${shift.color.replace("0.9", "0.3").replace("0.95", "0.3")}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={shift.color}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {isOpen ? (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </>
                  ) : (
                    <>
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </>
                  )}
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: t1 }}>{shift.role}</div>
                <div style={{ fontSize: 13, color: t2, marginTop: 2 }}>
                  {shift.day} · {shift.time}
                </div>
              </div>
            </div>

            {isOpen && (
              <div
                style={{
                  background: "rgba(255,159,10,0.10)",
                  border: "1px solid rgba(255,159,10,0.25)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  marginBottom: 14,
                  fontSize: 13,
                  fontWeight: 600,
                  color: AMBER,
                }}
              >
                ⚠️ {shift.openSlots} slot{(shift.openSlots ?? 0) > 1 ? "s" : ""} still unassigned
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {shift.assignees.map((a, i) => (
                <div
                  key={i}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: a.initials ? g2 : "transparent",
                    border: a.initials ? `1px solid ${bd}` : `1px dashed ${bd}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 600,
                    color: a.initials ? t2 : t3,
                  }}
                >
                  {a.initials || "+"}
                </div>
              ))}
            </div>

            {[
              ["Location", shift.location],
              [
                "Duration",
                `${shift.duration}${shift.rate !== "Standard" ? ` · ${shift.rate}` : ""}`,
              ],
              ...(isOpen
                ? [
                    ["Suitable for", shift.suitableFor ?? ""],
                    ["Open slots", String(shift.openSlots ?? 0)],
                  ]
                : [
                    ["Role", "Staff"],
                    ["Status", shift.status === "confirmed" ? "✓ Confirmed" : "Pending"],
                  ]),
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: `1px solid ${bds}`,
                }}
              >
                <span style={{ fontSize: 13, color: t3 }}>{k}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: shift.status === "confirmed" && k === "Status" ? GREEN : t1,
                  }}
                >
                  {v}
                </span>
              </div>
            ))}

            <button
              onClick={onClose}
              style={{
                width: "100%",
                borderRadius: 14,
                padding: "14px",
                fontSize: 15,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                marginTop: 16,
                background: t1,
                color: "var(--prv-bg)",
                transition: "opacity .15s",
              }}
            >
              {isOpen ? "Assign Staff" : "Edit Shift"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes prvFadeIn  { from{opacity:0}                      to{opacity:1} }
        @keyframes prvSlideUp { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}

// ── Main workspace ────────────────────────────────────────────────────────────

export function ScheduleWorkspace({ storeName }: { storeName: string }) {
  const [slot, setSlot] = useState<string | null>("09:00")
  const [avail, setAvail] = useState<Record<string, Availability>>(INITIAL_AVAIL)
  const [selectedShift, setSelected] = useState<ShiftData | null>(null)
  const [dismissed, setDismissed] = useState(new Set<string>())

  const { data: shiftData, isLoading: shiftsLoading } = useShifts()
  const { data: leaveData, isLoading: leaveLoading } = useTimeOffRequests("pending")

  // Team availability + today's booked slots come from real shifts / approved
  // leave; the grid is seeded once (render-time) then editable client-side.
  const serverAvail = shiftData?.teamAvailability ?? null
  const [availSeeded, setAvailSeeded] = useState(false)
  if (serverAvail && !availSeeded) {
    setAvailSeeded(true)
    setAvail(serverAvail.values)
  }
  const availPeople = serverAvail?.people ?? AVAIL_PEOPLE
  const availDays = serverAvail?.days ?? AVAIL_DAYS
  const takenSlots = shiftData?.takenSlots ?? []

  const shifts = useMemo(() => (shiftData?.shifts ?? []).map(mapShift), [shiftData?.shifts])
  const meta = shiftData?.meta
  const leaves = useMemo(() => (leaveData?.requests ?? []).map(mapLeave), [leaveData?.requests])
  const activeLeave = leaves.filter((l) => !dismissed.has(l.id))

  const STATS = [
    { val: shiftsLoading ? "…" : String(meta?.total ?? 0), label: "Shifts" },
    { val: shiftsLoading ? "…" : String(meta?.open ?? 0), label: "Open", color: AMBER },
    { val: shiftsLoading ? "…" : `${meta?.coveragePct ?? 0}%`, label: "Coverage" },
    { val: shiftsLoading ? "…" : `${meta?.totalHours ?? 0}h`, label: "This week" },
  ]

  // Compute current-week day strip
  const weekDays = useMemo(() => {
    const today = new Date()
    const dow = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
    monday.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split("T")[0]!
    const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dateStr = d.toISOString().split("T")[0]!
      const dayShifts = shifts.filter((s) => {
        // match by day label prefix — dayLabel is like "Lun 9 Iun"
        // use index date fallback via dayLabel comparison or by index
        return true // pips will be empty until shifts have their date field parsed
      })
      void dayShifts
      // use shift.day (dayLabel) to match — but we need the raw date from the API
      // The API ShiftSummary.date is an ISO date string (YYYY-MM-DD)
      const apiShifts = (shiftData?.shifts ?? []).filter((s) => s.date === dateStr)
      return {
        label: DAY_LABELS[i] as string,
        date: d.getDate(),
        today: dateStr === todayStr,
        pips: apiShifts.map((s) => shiftColor(s.status)),
        open: apiShifts.some((s) => s.status === "open"),
      }
    })
  }, [shifts, shiftData?.shifts])

  const openCount = meta?.open ?? 0
  const weekLabel = meta?.weekLabel ?? ""

  return (
    <div className="px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[13px] font-medium mb-0.5" style={{ color: t3 }}>
            PRV · {storeName}
          </p>
          <h1 className="text-[26px] font-semibold tracking-tight" style={{ color: t1 }}>
            Schedule
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous week"
            className="w-8 h-8 rounded-[9px] flex items-center justify-center"
            style={{ background: g2, border: `1px solid ${bds}`, color: t2 }}
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
          <span className="text-[13px] font-semibold" style={{ color: t2 }}>
            {weekLabel}
          </span>
          <button
            type="button"
            aria-label="Next week"
            className="w-8 h-8 rounded-[9px] flex items-center justify-center"
            style={{ background: g2, border: `1px solid ${bds}`, color: t2 }}
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

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {STATS.map(({ val, label, color }) => (
          <div
            key={label}
            className="rounded-[16px] p-3 text-center"
            style={{ background: g1, border: `1px solid ${bds}` }}
          >
            <div className="text-[18px] font-bold" style={{ color: color ?? t1 }}>
              {val}
            </div>
            <div
              className="text-[9px] font-semibold uppercase tracking-wider mt-0.5"
              style={{ color: t3 }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Open-shift alert */}
      {openCount > 0 && (
        <div
          className="flex items-start gap-2.5 rounded-[14px] px-3.5 py-3 mb-3"
          style={{ background: "rgba(255,159,10,0.10)", border: "1px solid rgba(255,159,10,0.28)" }}
        >
          <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: AMBER }} />
          <div>
            <p className="text-[13px] font-semibold" style={{ color: AMBER }}>
              {openCount} open shift{openCount !== 1 ? "s" : ""} this week
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: t2 }}>
              Unassigned slots need coverage — review below
            </p>
          </div>
        </div>
      )}

      {/* Week strip */}
      <div
        className="flex gap-1 rounded-[18px] px-2 py-3 mb-3 overflow-x-auto"
        style={{ background: g1, border: `1px solid ${bds}` }}
      >
        {weekDays.map(({ label, date, today, pips, open }) => (
          <div key={date} className="flex-1 flex flex-col items-center gap-1.5 min-w-[40px]">
            <span className="text-[10px] font-semibold tracking-wider" style={{ color: t3 }}>
              {label}
            </span>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold"
              style={{
                background: today ? t1 : "transparent",
                color: today ? "var(--prv-bg)" : t2,
              }}
            >
              {date}
            </div>
            <div className="flex flex-col gap-0.5 w-full px-1">
              {pips.map((p, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full w-full"
                  style={{
                    background: open ? "transparent" : p,
                    border: open ? `1px dashed ${p}` : "none",
                    opacity: 0.75,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Shift cards */}
      <SectionLabel>This week&apos;s shifts</SectionLabel>
      {shiftsLoading ? (
        <div className="text-center py-8 text-[13px]" style={{ color: t3 }}>
          Loading shifts…
        </div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-8 text-[13px]" style={{ color: t3 }}>
          No shifts this week
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {shifts.map((shift) => (
            <div key={shift.id} onClick={() => setSelected(shift)} className="cursor-pointer">
              <GlassShiftCard
                role={shift.role}
                time={`${shift.day} · ${shift.time}`}
                duration={shift.duration}
                status={shift.status}
                statusLabel={shift.statusLabel}
                color={shift.color}
                meta={shift.metaLabels.map((l) => ({ label: l }))}
                assignees={shift.assignees}
              />
            </div>
          ))}
        </div>
      )}

      {/* Time slot picker */}
      <SectionLabel>Assign a slot · today</SectionLabel>
      <div className="rounded-[18px] p-4" style={{ background: g1, border: `1px solid ${bds}` }}>
        <GlassTimeSlotPicker
          slots={SLOTS}
          value={slot}
          onChange={setSlot}
          takenSlots={takenSlots}
        />
      </div>

      {/* Team availability */}
      <SectionLabel>Team availability</SectionLabel>
      <div className="rounded-[18px] p-4" style={{ background: g1, border: `1px solid ${bds}` }}>
        <GlassAvailabilityGrid
          people={availPeople}
          days={availDays}
          value={avail}
          onChange={(r, c, next) => setAvail((prev) => ({ ...prev, [`${r}-${c}`]: next }))}
        />
      </div>

      {/* Pending leave requests */}
      {!leaveLoading && activeLeave.length > 0 && (
        <>
          <SectionLabel>Pending leave requests</SectionLabel>
          <div
            className="rounded-[18px] p-4"
            style={{ background: g1, border: `1px solid ${bds}` }}
          >
            {activeLeave.map((req, idx) => (
              <div
                key={req.id}
                className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: idx < activeLeave.length - 1 ? `1px solid ${bds}` : "none" }}
              >
                <div
                  className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0 text-[14px] font-semibold"
                  style={{ background: g2, border: `1px solid ${bd}`, color: t2 }}
                >
                  {req.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate" style={{ color: t1 }}>
                    {req.name}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: t3 }}>
                    {req.type} · {req.dates}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setDismissed((s) => new Set([...s, req.id]))}
                    className="text-[12px] font-semibold rounded-[8px] px-3 py-1.5 border-none cursor-pointer"
                    style={{ background: "rgba(48,209,88,0.15)", color: GREEN }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setDismissed((s) => new Set([...s, req.id]))}
                    className="text-[12px] font-semibold rounded-[8px] px-3 py-1.5 border-none cursor-pointer"
                    style={{ background: "rgba(255,69,58,0.12)", color: RED }}
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Shift detail sheet */}
      {selectedShift && (
        <ShiftDetailSheet shift={selectedShift} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
