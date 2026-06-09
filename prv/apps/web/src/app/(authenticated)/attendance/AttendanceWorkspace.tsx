"use client"

import { useState, useMemo } from "react"
import { useAttendanceRecords } from "@/lib/api-hooks"
import type { AttendanceRecord } from "@/app/api/attendance/route"

type AttendanceStatus = "Present" | "Late" | "Absent" | "On Leave" | "Clocked Out"
type FilterType = "All" | "Present" | "Late" | "Absent"

interface Employee {
  id: string
  initials: string
  name: string
  role: string
  location: string
  status: AttendanceStatus
  clockIn?: string
  clockOut?: string
  duration?: string
  lateMin?: number
  leaveRange?: string
  barLeft: number
  barWidth: number
}

// ── API mapper ────────────────────────────────────────────────────────────────

function mapApiStatus(s: AttendanceRecord["status"]): AttendanceStatus {
  const m: Record<AttendanceRecord["status"], AttendanceStatus> = {
    present: "Present",
    late: "Late",
    absent: "Absent",
    leave: "On Leave",
    clocked_out: "Clocked Out",
  }
  return m[s]
}

function fmtMins(mins: number | null): string | undefined {
  if (!mins) return undefined
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function mapRecord(r: AttendanceRecord): Employee {
  return {
    id: r.id,
    initials: r.initials,
    name: r.name,
    role: r.role,
    location: r.site,
    status: mapApiStatus(r.status),
    clockIn: r.clockIn ?? undefined,
    clockOut: r.clockOut ?? undefined,
    duration: fmtMins(r.activeMinutes),
    lateMin: r.lateMinutes ?? undefined,
    leaveRange: r.leaveLabel ?? undefined,
    barLeft: 0,
    barWidth: r.barPct,
  }
}

const FILTERS: FilterType[] = ["All", "Present", "Late", "Absent"]

const g1  = "var(--prv-g1)"
const g2  = "var(--prv-g2)"
const bds = "var(--prv-border-subtle)"
const bd  = "var(--prv-border)"
const t1  = "var(--prv-text-1)"
const t2  = "var(--prv-text-2)"
const t3  = "var(--prv-text-3)"
const green = "rgba(48,209,88,0.95)"
const red = "rgba(255,69,58,0.95)"
const amber = "rgba(255,159,10,0.95)"
const blue = "rgba(10,132,255,0.9)"

const card: React.CSSProperties = {
  background: g1,
  border: `1px solid ${bds}`,
  borderRadius: 18,
  position: "relative",
  overflow: "hidden",
  marginBottom: 12,
}

function TopEdge() {
  return <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: "linear-gradient(90deg,transparent,var(--prv-border),transparent)" }} />
}

function StatusPill({ status, clockIn, clockOut, lateMin, leaveRange }: { status: AttendanceStatus; clockIn?: string; clockOut?: string; lateMin?: number; leaveRange?: string }) {
  if (status === "Present") return <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "rgba(48,209,88,0.13)", color: green, whiteSpace: "nowrap" }}>{clockIn} →</span>
  if (status === "Late") return <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "rgba(255,159,10,0.13)", color: amber, whiteSpace: "nowrap" }}>{clockIn} →</span>
  if (status === "Absent") return <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "rgba(255,69,58,0.12)", color: red, whiteSpace: "nowrap" }}>Absent</span>
  if (status === "On Leave") return <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "rgba(10,132,255,0.12)", color: blue, whiteSpace: "nowrap" }}>On Leave</span>
  return <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "var(--prv-border)", color: t2, whiteSpace: "nowrap" }}>{clockIn} – {clockOut}</span>
}

function TimeBar({ status, barLeft, barWidth }: { status: AttendanceStatus; barLeft: number; barWidth: number }) {
  const colors: Record<AttendanceStatus, string> = {
    Present: "rgba(48,209,88,0.45)",
    Late: "rgba(255,159,10,0.45)",
    Absent: "transparent",
    "On Leave": "rgba(10,132,255,0.18)",
    "Clocked Out": "var(--prv-text-3)",
  }
  return (
    <div style={{ position: "relative", height: 6, background: "var(--prv-border-subtle)", borderRadius: 3, marginTop: 6, width: "100%" }}>
      <div style={{ position: "absolute", top: 0, left: `${barLeft}%`, width: `${barWidth}%`, height: 6, borderRadius: 3, background: colors[status] }} />
    </div>
  )
}

export function AttendanceWorkspace() {
  const [filter, setFilter] = useState<FilterType>("All")
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [clockedIn, setClockedIn] = useState(true)

  const { data, isLoading } = useAttendanceRecords()
  const employees = useMemo<Employee[]>(
    () => (data?.records ?? []).map(mapRecord),
    [data?.records],
  )
  const meta = data?.meta

  const now = new Date()
  const dateLabel = meta?.dateLabel ?? now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

  const filtered = employees.filter(e => {
    if (filter === "All") return true
    if (filter === "Present") return e.status === "Present" || e.status === "Clocked Out"
    if (filter === "Late") return e.status === "Late"
    if (filter === "Absent") return e.status === "Absent"
    return true
  })

  if (selectedEmployee) {
    const emp = selectedEmployee
    return (
      <div style={{ padding: "32px 16px 120px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", WebkitFontSmoothing: "antialiased" }}>
        <button
          onClick={() => setSelectedEmployee(null)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: t2, fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 20, padding: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Attendance
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: g2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: t2, flexShrink: 0 }}>
            {emp.initials}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--prv-text-1)" }}>{emp.name}</div>
            <div style={{ fontSize: 13, color: t3, marginTop: 2 }}>{emp.role} · {emp.location} · {dateLabel}</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <StatusPill status={emp.status} clockIn={emp.clockIn} clockOut={emp.clockOut} lateMin={emp.lateMin} leaveRange={emp.leaveRange} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
          {[
            { val: emp.clockIn ?? "—", label: "Clock In" },
            { val: emp.duration ?? "—", label: "Active", color: emp.duration ? green : t3 },
            { val: "1h 12m", label: "Breaks", color: amber },
          ].map(s => (
            <div key={s.label} style={{ padding: "12px 10px", borderRadius: 14, background: g1, border: `1px solid ${bds}`, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color ?? "var(--prv-text-1)" }}>{s.val}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 2px 10px" }}>Today's Timeline</p>
        <div style={card}>
          <TopEdge />
          {[
            emp.clockIn  ? { time: emp.clockIn,  label: "Clock In",  sub: emp.location + " · GPS verified", color: green } : null,
            emp.clockOut ? { time: emp.clockOut, label: "Clock Out", sub: emp.duration ? `Active ${emp.duration}` : "Shift ended", color: t3 } : null,
            !emp.clockIn && emp.status === "Absent" ? { time: "—", label: "No check-in", sub: "Employee absent today", color: red } : null,
            !emp.clockIn && emp.status === "On Leave" ? { time: "—", label: "On Leave", sub: emp.leaveRange ?? "Leave period", color: blue } : null,
          ].filter(Boolean).map((ev, i, arr) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${bds}` : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev!.color, marginTop: 5, flexShrink: 0 }} />
              <div style={{ width: 46, flexShrink: 0, fontSize: 12, color: t3, marginTop: 1 }}>{ev!.time}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: ev!.time === "—" ? t3 : "var(--prv-text-1)" }}>{ev!.label}</div>
                <div style={{ fontSize: 12, color: t3, marginTop: 1 }}>{ev!.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "18px 2px 10px" }}>This Week</p>
        <div style={{ ...card, padding: "14px 16px" }}>
          <TopEdge />
          {(() => {
            const today = new Date()
            const dow = today.getDay()
            const mon = new Date(today); mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
            const days = Array.from({ length: 5 }, (_, i) => {
              const d = new Date(mon); d.setDate(mon.getDate() + i)
              const isToday = d.toDateString() === today.toDateString()
              return { label: ["Mon","Tue","Wed","Thu","Fri"][i]!, num: d.getDate(), isToday }
            })
            return (
              <>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 40, marginBottom: 8 }}>
                  {days.map(d => (
                    <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <div style={{ fontSize: 10, color: d.isToday ? t3 : green, fontWeight: 700 }}>{d.isToday ? "now" : "8h"}</div>
                      <div style={{ width: "100%", height: d.isToday ? 22 : 30, borderRadius: 4, background: d.isToday ? "rgba(48,209,88,0.25)" : "rgba(48,209,88,0.45)" }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {days.map(d => (
                    <div key={d.label} style={{ flex: 1, fontSize: 9, color: d.isToday ? "var(--prv-text-1)" : t3, textAlign: "center", fontWeight: d.isToday ? 700 : 400 }}>{d.label}</div>
                  ))}
                </div>
              </>
            )
          })()}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: "32px 16px 120px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", WebkitFontSmoothing: "antialiased" }}>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 13, color: t3, marginBottom: 2 }}>People</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--prv-text-1)" }}>Attendance</h1>
        </div>
        <div style={{ padding: "6px 12px", borderRadius: 10, background: g1, border: `1px solid ${bds}`, fontSize: 12, fontWeight: 500, color: t2 }}>
          {dateLabel}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { val: isLoading ? "…" : String(meta?.present ?? employees.filter(e => e.status === "Present" || e.status === "Clocked Out").length), label: "Present", color: green },
          { val: isLoading ? "…" : String(meta?.late ?? employees.filter(e => e.status === "Late").length), label: "Late", color: amber },
          { val: isLoading ? "…" : String(meta?.absent ?? employees.filter(e => e.status === "Absent").length), label: "Absent", color: red },
          { val: isLoading ? "…" : String(meta?.onLeave ?? employees.filter(e => e.status === "On Leave").length), label: "On Leave", color: blue },
        ].map(k => (
          <div key={k.label} style={{ padding: "12px 8px", borderRadius: 14, background: g1, border: `1px solid ${bds}`, textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Clock-in banner */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 16, background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.15)", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--prv-text-1)" }}>
            {clockedIn ? "Clocked In Since 08:42" : "Not Clocked In"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(48,209,88,0.75)", marginTop: 2 }}>
            {clockedIn ? "6h 18m active · Cluj HQ" : "Tap to start your shift"}
          </div>
        </div>
        <button
          onClick={() => setClockedIn(v => !v)}
          style={{ padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", background: clockedIn ? "rgba(255,69,58,0.80)" : "rgba(48,209,88,0.85)", color: clockedIn ? "#fff" : "#000", transition: "all 0.2s" }}
        >
          {clockedIn ? "Clock Out" : "Clock In"}
        </button>
      </div>

      {/* Week strip */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[
          { name: "Mon", num: 2, dot: green, today: false },
          { name: "Tue", num: 3, dot: green, today: false },
          { name: "Wed", num: 4, dot: green, today: false },
          { name: "Thu", num: 5, dot: green, today: false },
          { name: "Fri", num: 6, dot: green, today: true },
          { name: "Sat", num: 7, dot: "var(--prv-border)", today: false },
          { name: "Sun", num: 8, dot: "var(--prv-border)", today: false },
        ].map(d => (
          <div key={d.name} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderRadius: 12, background: d.today ? g2 : "transparent", border: d.today ? `1px solid var(--prv-g2)` : "1px solid transparent" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: d.today ? "var(--prv-text-1)" : t3 }}>{d.name}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: d.today ? "var(--prv-text-1)" : "var(--prv-text-1)" }}>{d.num}</div>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: d.dot }} />
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 4, padding: 4, background: g1, border: `1px solid ${bds}`, borderRadius: 12, marginBottom: 14 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: filter === f ? "var(--prv-text-1)" : t3, background: filter === f ? g2 : "transparent", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
            {f}
          </button>
        ))}
      </div>

      {/* Employee list */}
      <div style={card}>
        <TopEdge />
        {isLoading ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: t3, fontSize: 14 }}>Loading attendance…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: t3, fontSize: 14 }}>No records found.</div>
        ) : (
          filtered.map((emp, i) => (
            <button key={emp.id} onClick={() => setSelectedEmployee(emp)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${bds}` : "none", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: g2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: t2, flexShrink: 0 }}>
                {emp.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--prv-text-1)" }}>{emp.name}</div>
                <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>{emp.role} · {emp.location}</div>
                <TimeBar status={emp.status} barLeft={emp.barLeft} barWidth={emp.barWidth} />
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                <StatusPill status={emp.status} clockIn={emp.clockIn} clockOut={emp.clockOut} lateMin={emp.lateMin} leaveRange={emp.leaveRange} />
                <div style={{ fontSize: 11, color: t3, marginTop: 4 }}>
                  {emp.status === "Present" && emp.duration}
                  {emp.status === "Late" && `+${emp.lateMin} min late`}
                  {emp.status === "Absent" && "No check-in"}
                  {emp.status === "On Leave" && emp.leaveRange}
                  {emp.status === "Clocked Out" && emp.duration}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
