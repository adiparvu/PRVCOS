"use client"

import { useState } from "react"

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

interface TimelineEvent {
  time: string
  label: string
  sub: string
  color: string
}

const EMPLOYEES: Employee[] = [
  { id: "ap", initials: "AP", name: "Andrei Popescu", role: "Project Manager", location: "Cluj", status: "Present", clockIn: "08:12", duration: "6h 48m", barLeft: 5, barWidth: 55 },
  { id: "em", initials: "EM", name: "Elena Marin", role: "Project Manager", location: "Timișoara", status: "Late", clockIn: "09:24", lateMin: 84, barLeft: 14, barWidth: 44 },
  { id: "mi", initials: "MI", name: "Maria Ionescu", role: "HR Manager", location: "Cluj", status: "Present", clockIn: "08:05", duration: "6h 55m", barLeft: 4, barWidth: 56 },
  { id: "lt", initials: "LT", name: "Liviu Toma", role: "Tile Specialist", location: "Cluj", status: "Absent", barLeft: 0, barWidth: 0 },
  { id: "rd", initials: "RD", name: "Radu Dumitrescu", role: "Electrician", location: "Timișoara", status: "On Leave", leaveRange: "Jun 4–8", barLeft: 0, barWidth: 100 },
  { id: "cn", initials: "CN", name: "Cosmin Neagu", role: "Painter", location: "Cluj", status: "Clocked Out", clockIn: "08:18", clockOut: "16:30", duration: "8h 12m", barLeft: 3, barWidth: 52 },
]

const TIMELINE: TimelineEvent[] = [
  { time: "08:12", label: "Clock In", sub: "Cluj HQ · GPS verified · iPhone 15 Pro", color: "rgba(48,209,88,0.95)" },
  { time: "10:30", label: "Break Start", sub: "Coffee break · 15 min", color: "rgba(255,159,10,0.95)" },
  { time: "10:45", label: "Break End", sub: "Resumed work", color: "rgba(48,209,88,0.95)" },
  { time: "12:00", label: "Lunch Break", sub: "57 min · Off-site", color: "rgba(255,159,10,0.95)" },
  { time: "12:57", label: "Resumed", sub: "Back at Cluj HQ", color: "rgba(48,209,88,0.95)" },
  { time: "—", label: "Clock Out", sub: "Still active", color: "var(--prv-text-3)" },
]

const WEEK_DAYS = [
  { label: "Mon", num: 2, hours: 8, barH: 30, today: false },
  { label: "Tue", num: 3, hours: 8, barH: 30, today: false },
  { label: "Wed", num: 4, hours: 7, barH: 26, today: false },
  { label: "Thu", num: 5, hours: 8, barH: 30, today: false },
  { label: "Fri", num: 6, hours: null, barH: 22, today: true },
]

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

  const now = new Date()
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

  const filtered = EMPLOYEES.filter(e => {
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
          {TIMELINE.map((ev, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 16px", borderBottom: i < TIMELINE.length - 1 ? `1px solid ${bds}` : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev.color, marginTop: 5, flexShrink: 0 }} />
              <div style={{ width: 46, flexShrink: 0, fontSize: 12, color: t3, marginTop: 1 }}>{ev.time}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: ev.time === "—" ? t3 : "var(--prv-text-1)" }}>{ev.label}</div>
                <div style={{ fontSize: 12, color: t3, marginTop: 1 }}>{ev.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "18px 2px 10px" }}>This Week</p>
        <div style={{ ...card, padding: "14px 16px" }}>
          <TopEdge />
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 40, marginBottom: 8 }}>
            {WEEK_DAYS.map(d => (
              <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ fontSize: 10, color: d.today ? t3 : green, fontWeight: 700 }}>{d.hours ? `${d.hours}h` : "6h+"}</div>
                <div style={{ width: "100%", height: d.barH, borderRadius: 4, background: d.today ? "rgba(48,209,88,0.25)" : "rgba(48,209,88,0.45)" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {WEEK_DAYS.map(d => (
              <div key={d.label} style={{ flex: 1, fontSize: 9, color: d.today ? "var(--prv-text-1)" : t3, textAlign: "center", fontWeight: d.today ? 700 : 400 }}>{d.label}</div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${bds}` }}>
            <span style={{ fontSize: 13, color: t2 }}>Week Total</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: green }}>37h 48m</span>
          </div>
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
          { val: "118", label: "Present", color: green },
          { val: "9", label: "Late", color: amber },
          { val: "6", label: "Absent", color: red },
          { val: "9", label: "On Leave", color: blue },
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
        {filtered.map((emp, i) => (
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
        ))}
        <div style={{ padding: "12px 16px", textAlign: "center", borderTop: `1px solid ${bds}` }}>
          <span style={{ fontSize: 12, color: t3 }}>136 more employees ›</span>
        </div>
      </div>
    </div>
  )
}
