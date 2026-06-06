"use client"

import { useState } from "react"

type VehicleStatus = "Active" | "Idle" | "Service" | "Unavailable"
type FilterType = "All" | "Active" | "Service" | "Idle"

interface MaintenanceRecord {
  label: string
  detail: string
  status: "Done" | "Due Soon" | "Overdue"
}

interface ActivityEvent {
  time: string
  label: string
  sub: string
  color: string
}

interface Vehicle {
  id: string
  plate: string
  model: string
  year: number
  type: string
  fuel: string
  base: string
  status: VehicleStatus
  driver?: string
  assignment?: string
  fuelPct: number
  kmToday: number
  odometer: number
  nextServiceKm: number
  insurance: string
  itp: string
  maintenance: MaintenanceRecord[]
  activity: ActivityEvent[]
}

const VEHICLES: Vehicle[] = [
  {
    id: "v1", plate: "B-44-PRV", model: "Ford Transit", year: 2023, type: "Van", fuel: "Diesel", base: "Cluj",
    status: "Active", driver: "Andrei Popescu", assignment: "Cluj → Timișoara",
    fuelPct: 78, kmToday: 214, odometer: 38412, nextServiceKm: 42000,
    insurance: "Valid · Dec 2026", itp: "Valid · Mar 2027",
    maintenance: [
      { label: "Full Service", detail: "Apr 12 · 34,100 km · €320", status: "Done" },
      { label: "Tyre Rotation", detail: "Feb 3 · 28,600 km · €80", status: "Done" },
      { label: "Oil Change + Filter", detail: "Due at 42,000 km · ~3,600 km away", status: "Due Soon" },
    ],
    activity: [
      { time: "07:48", label: "Departed Cluj HQ", sub: "Odometer: 38,198 km", color: "rgba(48,209,88,0.95)" },
      { time: "09:15", label: "Fuelled — Cluj Nord", sub: "42L · €78.50 · 78% → 100%", color: "rgba(10,132,255,0.9)" },
      { time: "11:30", label: "Arrived Timișoara Site", sub: "Trip: 214 km · 3h 42m", color: "rgba(255,159,10,0.95)" },
      { time: "—", label: "Return trip", sub: "Expected 17:00", color: "rgba(255,255,255,0.15)" },
    ],
  },
  {
    id: "v2", plate: "CJ-03-PRV", model: "VW Crafter", year: 2022, type: "Cargo Van", fuel: "Diesel", base: "Cluj",
    status: "Active", driver: "Elena Marin", assignment: "Timișoara site",
    fuelPct: 45, kmToday: 88, odometer: 54820, nextServiceKm: 56000,
    insurance: "Valid · Jun 2027", itp: "Valid · Sep 2026",
    maintenance: [
      { label: "Full Service", detail: "Mar 5 · 50,200 km · €280", status: "Done" },
      { label: "Brake Pads", detail: "Due at 56,000 km · ~1,180 km away", status: "Due Soon" },
    ],
    activity: [
      { time: "06:30", label: "Departed Cluj HQ", sub: "Odometer: 54,732 km", color: "rgba(48,209,88,0.95)" },
      { time: "08:45", label: "Arrived Timișoara", sub: "Trip: 88 km · 2h 15m", color: "rgba(255,159,10,0.95)" },
      { time: "—", label: "On site", sub: "Loading materials", color: "rgba(255,255,255,0.15)" },
    ],
  },
  {
    id: "v3", plate: "CJ-12-PRV", model: "Mercedes Sprinter", year: 2021, type: "Van", fuel: "Diesel", base: "Cluj",
    status: "Service", assignment: "AutoPro Service · Oil change + brakes",
    fuelPct: 60, kmToday: 0, odometer: 72100, nextServiceKm: 75000,
    insurance: "Valid · Aug 2026", itp: "Valid · Nov 2026",
    maintenance: [
      { label: "Full Service", detail: "Jan 18 · 65,000 km · €420", status: "Done" },
      { label: "Oil Change + Brake Service", detail: "In progress · AutoPro Cluj · Back Jun 8", status: "Due Soon" },
    ],
    activity: [
      { time: "08:00", label: "Dropped at AutoPro", sub: "Scheduled maintenance", color: "rgba(255,159,10,0.95)" },
      { time: "—", label: "Expected return", sub: "Jun 8 · 16:00", color: "rgba(255,255,255,0.15)" },
    ],
  },
  {
    id: "v4", plate: "TM-08-PRV", model: "Renault Master", year: 2022, type: "Van", fuel: "Diesel", base: "Timișoara",
    status: "Idle", assignment: "Unassigned · Warehouse Timișoara",
    fuelPct: 92, kmToday: 0, odometer: 29340, nextServiceKm: 32000,
    insurance: "Valid · Feb 2027", itp: "Valid · May 2027",
    maintenance: [
      { label: "Full Service", detail: "May 2 · 25,000 km · €260", status: "Done" },
    ],
    activity: [
      { time: "—", label: "No activity today", sub: "Vehicle idle at warehouse", color: "rgba(255,255,255,0.15)" },
    ],
  },
]

const FILTERS: FilterType[] = ["All", "Active", "Service", "Idle"]

const g1 = "rgba(255,255,255,0.06)"
const g2 = "rgba(255,255,255,0.10)"
const bds = "rgba(255,255,255,0.07)"
const t2 = "rgba(255,255,255,0.65)"
const t3 = "rgba(255,255,255,0.35)"
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
  return <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)" }} />
}

function StatusPill({ status }: { status: VehicleStatus }) {
  const styles: Record<VehicleStatus, React.CSSProperties> = {
    Active: { background: "rgba(48,209,88,0.13)", color: green },
    Idle: { background: "rgba(255,255,255,0.08)", color: t2 },
    Service: { background: "rgba(255,159,10,0.13)", color: amber },
    Unavailable: { background: "rgba(255,69,58,0.12)", color: red },
  }
  return <span style={{ ...styles[status], fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6 }}>{status}</span>
}

function VehicleIcon({ status }: { status: VehicleStatus }) {
  const colors: Record<VehicleStatus, { bg: string; stroke: string }> = {
    Active: { bg: "rgba(48,209,88,0.10)", stroke: "rgba(48,209,88,0.85)" },
    Idle: { bg: "rgba(255,255,255,0.06)", stroke: "rgba(255,255,255,0.35)" },
    Service: { bg: "rgba(255,159,10,0.10)", stroke: "rgba(255,159,10,0.85)" },
    Unavailable: { bg: "rgba(255,69,58,0.10)", stroke: "rgba(255,69,58,0.85)" },
  }
  const { bg, stroke } = colors[status]
  return (
    <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    </div>
  )
}

function FuelBar({ pct }: { pct: number }) {
  const color = pct > 60 ? "rgba(48,209,88,0.6)" : pct > 30 ? "rgba(255,159,10,0.7)" : "rgba(255,69,58,0.7)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={t3} strokeWidth="2">
        <path d="M3 22V7l7-5 7 5v15" /><path d="M17 22v-5h4l2 2v3h-6z" />
      </svg>
      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: color }} />
      </div>
      <div style={{ fontSize: 10, color: t3, width: 26, textAlign: "right" }}>{pct}%</div>
    </div>
  )
}

export function FleetWorkspace() {
  const [filter, setFilter] = useState<FilterType>("All")
  const [selected, setSelected] = useState<Vehicle | null>(null)

  const filtered = VEHICLES.filter(v => {
    if (filter === "All") return true
    if (filter === "Active") return v.status === "Active"
    if (filter === "Service") return v.status === "Service"
    if (filter === "Idle") return v.status === "Idle"
    return true
  })

  if (selected) {
    const v = selected
    const kmToService = v.nextServiceKm - v.odometer
    return (
      <div style={{ padding: "32px 16px 120px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", WebkitFontSmoothing: "antialiased" }}>
        <button onClick={() => setSelected(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: t2, fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 20, padding: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Fleet
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <VehicleIcon status={v.status} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", fontFamily: "monospace", color: "rgba(255,255,255,0.95)", background: g2, border: `1px solid ${bds}`, padding: "3px 8px", borderRadius: 6, display: "inline-block", marginBottom: 4 }}>{v.plate}</span>
            <div style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>{v.model} {v.year}</div>
            <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>{v.type} · {v.fuel} · {v.base} base</div>
          </div>
          <StatusPill status={v.status} />
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
          {[
            { val: `${v.fuelPct}%`, label: "Fuel", color: v.fuelPct > 60 ? green : amber },
            { val: String(v.kmToday), label: "km Today", color: undefined },
            { val: String(kmToService.toLocaleString()), label: "km/Service", color: kmToService < 2000 ? amber : undefined },
          ].map(s => (
            <div key={s.label} style={{ padding: "12px 8px", borderRadius: 14, background: g1, border: `1px solid ${bds}`, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color ?? "rgba(255,255,255,0.95)" }}>{s.val}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Vehicle info */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 2px 10px" }}>Vehicle Info</p>
        <div style={card}>
          <TopEdge />
          {[
            { label: "Driver", val: v.driver ?? "Unassigned" },
            { label: "Assignment", val: v.assignment ?? "—" },
            { label: "Odometer", val: `${v.odometer.toLocaleString()} km` },
            { label: "Next service", val: `${v.nextServiceKm.toLocaleString()} km (+${kmToService.toLocaleString()})`, highlight: kmToService < 2000 },
            { label: "Insurance", val: v.insurance },
            { label: "ITP (inspection)", val: v.itp },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${bds}` : "none" }}>
              <span style={{ fontSize: 13, color: t2 }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: row.highlight ? amber : "rgba(255,255,255,0.95)" }}>{row.val}</span>
            </div>
          ))}
        </div>

        {/* Maintenance */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "18px 2px 10px" }}>Maintenance</p>
        <div style={card}>
          <TopEdge />
          {v.maintenance.map((m, i) => {
            const dotColor = m.status === "Done" ? green : m.status === "Due Soon" ? amber : red
            const pillStyle = m.status === "Done"
              ? { background: "rgba(48,209,88,0.13)", color: green }
              : m.status === "Due Soon"
              ? { background: "rgba(255,159,10,0.13)", color: amber }
              : { background: "rgba(255,69,58,0.12)", color: red }
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < v.maintenance.length - 1 ? `1px solid ${bds}` : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.95)" }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: t3, marginTop: 1 }}>{m.detail}</div>
                </div>
                <span style={{ ...pillStyle, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6 }}>{m.status}</span>
              </div>
            )
          })}
        </div>

        {/* Activity */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "18px 2px 10px" }}>Today's Activity</p>
        <div style={card}>
          <TopEdge />
          {v.activity.map((ev, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 16px", borderBottom: i < v.activity.length - 1 ? `1px solid ${bds}` : "none" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: ev.color, marginTop: 5, flexShrink: 0 }} />
              <div style={{ width: 44, flexShrink: 0, fontSize: 11, color: t3, marginTop: 1 }}>{ev.time}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: ev.time === "—" ? t3 : "rgba(255,255,255,0.95)" }}>{ev.label}</div>
                <div style={{ fontSize: 11, color: t3, marginTop: 1 }}>{ev.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: "32px 16px 120px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", WebkitFontSmoothing: "antialiased" }}>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 13, color: t3, marginBottom: 2 }}>Operations</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.95)" }}>Fleet</h1>
        </div>
        <div style={{ padding: "6px 12px", borderRadius: 10, background: g1, border: `1px solid ${bds}`, fontSize: 12, fontWeight: 500, color: t2 }}>
          {VEHICLES.length * 6} Vehicles
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { val: "17", label: "Active", color: green },
          { val: "4", label: "Idle", color: undefined },
          { val: "2", label: "Service", color: amber },
          { val: "1", label: "Unavail", color: red },
        ].map(k => (
          <div key={k.label} style={{ padding: "12px 8px", borderRadius: 14, background: g1, border: `1px solid ${bds}`, textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: k.color ?? "rgba(255,255,255,0.95)" }}>{k.val}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Alert */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, background: "rgba(255,159,10,0.07)", border: "1px solid rgba(255,159,10,0.18)", marginBottom: 14 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,159,10,0.9)" strokeWidth="1.8" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: amber }}>3 Services Due</div>
          <div style={{ fontSize: 12, color: "rgba(255,159,10,0.65)", marginTop: 1 }}>B-44-PRV, CJ-12-PRV due this week · CJ-07-PRV overdue</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 4, padding: 4, background: g1, border: `1px solid ${bds}`, borderRadius: 12, marginBottom: 14 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: filter === f ? "rgba(255,255,255,0.95)" : t3, background: filter === f ? g2 : "transparent", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
            {f}
          </button>
        ))}
      </div>

      {/* Vehicle list */}
      <div style={card}>
        <TopEdge />
        {filtered.map((v, i) => (
          <button key={v.id} onClick={() => setSelected(v)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${bds}` : "none", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
            <VehicleIcon status={v.status} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", fontFamily: "monospace", color: "rgba(255,255,255,0.95)", background: g2, border: `1px solid ${bds}`, padding: "2px 6px", borderRadius: 5, display: "inline-block", marginBottom: 3 }}>{v.plate}</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.95)" }}>{v.model} {v.year}</div>
              <div style={{ fontSize: 11, color: t3, marginTop: 1 }}>{v.driver ? `${v.driver} · ` : ""}{v.assignment}</div>
              <FuelBar pct={v.fuelPct} />
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <StatusPill status={v.status} />
              <div style={{ fontSize: 11, color: t3, marginTop: 5 }}>{v.kmToday > 0 ? `${v.kmToday} km today` : "0 km today"}</div>
            </div>
          </button>
        ))}
        <div style={{ padding: "12px 16px", textAlign: "center", borderTop: `1px solid ${bds}` }}>
          <span style={{ fontSize: 12, color: t3 }}>20 more vehicles ›</span>
        </div>
      </div>
    </div>
  )
}
