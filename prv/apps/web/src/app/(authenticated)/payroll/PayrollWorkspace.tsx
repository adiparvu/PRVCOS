"use client"

import { useState } from "react"

type RunStatus = "Processing" | "Done" | "Pending"
type FilterType = "All Runs" | "Weekly" | "Monthly" | "Special"

interface PayrollRun {
  id: string
  title: string
  subtitle: string
  amount: number
  status: RunStatus
  type: "Weekly" | "Monthly" | "Special"
}

interface Employee {
  initials: string
  name: string
  role: string
  location: string
  net: number
  gross: string
}

const RUNS: PayrollRun[] = [
  { id: "jun-w2", title: "June W2 — Processing", subtitle: "142 employees · Jun 9–15", amount: 28400, status: "Processing", type: "Weekly" },
  { id: "jun-w1", title: "June W1 — Completed", subtitle: "142 employees · Jun 2–8", amount: 27900, status: "Done", type: "Weekly" },
  { id: "may-w4", title: "May W4 — Completed", subtitle: "140 employees · May 26 – Jun 1", amount: 27400, status: "Done", type: "Weekly" },
  { id: "may-w3", title: "May W3 — Completed", subtitle: "140 employees · May 19–25", amount: 26800, status: "Done", type: "Weekly" },
  { id: "may-monthly", title: "May Monthly Bonus", subtitle: "142 employees · May 31", amount: 18600, status: "Done", type: "Monthly" },
  { id: "bonus-q1", title: "Bonus Run — Q1", subtitle: "38 employees · Apr 15 · Pending approval", amount: 14200, status: "Pending", type: "Special" },
]

const EMPLOYEES: Employee[] = [
  { initials: "AP", name: "Andrei Popescu", role: "Project Manager", location: "Cluj", net: 3200, gross: "€4,480" },
  { initials: "EM", name: "Elena Marin", role: "Project Manager", location: "Timișoara", net: 3200, gross: "€4,480" },
  { initials: "MI", name: "Maria Ionescu", role: "HR Manager", location: "Cluj", net: 2800, gross: "€3,920" },
  { initials: "LT", name: "Liviu Toma", role: "Tile Specialist", location: "Cluj", net: 1960, gross: "€2,744 + 12h OT" },
]

const CHART_MONTHS = [
  { label: "Jan", height: 52 },
  { label: "Feb", height: 55 },
  { label: "Mar", height: 50 },
  { label: "Apr", height: 58 },
  { label: "May", height: 60 },
  { label: "Jun", height: 100 },
]

const FILTERS: FilterType[] = ["All Runs", "Weekly", "Monthly", "Special"]

const g1 = "rgba(255,255,255,0.06)"
const g2 = "rgba(255,255,255,0.10)"
const bds = "rgba(255,255,255,0.07)"
const bd = "rgba(255,255,255,0.12)"
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

function StatusPill({ status }: { status: RunStatus }) {
  const styles: Record<RunStatus, React.CSSProperties> = {
    Done: { background: "rgba(48,209,88,0.14)", color: green },
    Pending: { background: "rgba(255,159,10,0.14)", color: amber },
    Processing: { background: "rgba(10,132,255,0.14)", color: blue },
  }
  return (
    <span style={{ ...styles[status], fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6 }}>
      {status}
    </span>
  )
}

function RunIcon({ status }: { status: RunStatus }) {
  if (status === "Processing")
    return (
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(10,132,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(10,132,255,0.9)" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
    )
  if (status === "Done")
    return (
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(48,209,88,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(48,209,88,0.85)" strokeWidth="1.8" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    )
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,159,10,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,159,10,0.9)" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </div>
  )
}

function TopEdge() {
  return (
    <div style={{ position: "absolute", inset: "0 0 auto", height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)" }} />
  )
}

export function PayrollWorkspace() {
  const [filter, setFilter] = useState<FilterType>("All Runs")
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null)

  const now = new Date()
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const filteredRuns = RUNS.filter(r => filter === "All Runs" || r.type === filter)

  if (selectedRun) {
    return (
      <div style={{ padding: "32px 16px 120px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", WebkitFontSmoothing: "antialiased" }}>
        {/* Back + header */}
        <button
          onClick={() => setSelectedRun(null)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: t2, fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 20, padding: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Payroll Runs
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 13, color: t3, marginBottom: 2 }}>Run Detail</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.95)" }}>
              {selectedRun.title.split(" — ")[0]}
            </h1>
            <p style={{ fontSize: 13, color: t2, marginTop: 4 }}>{selectedRun.subtitle}</p>
          </div>
          <StatusPill status={selectedRun.status} />
        </div>

        {/* Financial summary */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 2px 10px" }}>Summary</p>
        <div style={card}>
          <TopEdge />
          {[
            { label: "Gross Payroll", val: "€38,640", valColor: undefined },
            { label: "Employee Taxes (CAS + CASS)", val: "−€7,920", valColor: red },
            { label: "Employer Contributions", val: "−€2,820", valColor: red },
            { label: "Net Paid to Employees", val: "€27,900", valColor: green },
            { label: "Total Employer Cost", val: "€30,720", valColor: undefined },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${bds}` : "none" }}>
              <span style={{ fontSize: 13, color: t2 }}>{row.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: row.valColor ?? "rgba(255,255,255,0.95)" }}>{row.val}</span>
            </div>
          ))}
        </div>

        {/* Employee payslips */}
        <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", margin: "18px 2px 10px" }}>Employee Payslips (142)</p>
        <div style={card}>
          <TopEdge />
          {EMPLOYEES.map((emp, i) => (
            <div key={emp.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${bds}` }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: g2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: t2, flexShrink: 0 }}>
                {emp.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.95)" }}>{emp.name}</div>
                <div style={{ fontSize: 12, color: t3, marginTop: 1 }}>{emp.role} · {emp.location}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: green }}>€{emp.net.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: t3, marginTop: 2 }}>Gross: {emp.gross}</div>
              </div>
            </div>
          ))}
          <div style={{ padding: "12px 16px", textAlign: "center" }}>
            <span style={{ fontSize: 12, color: t3 }}>138 more employees ›</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: "32px 16px 120px", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif", WebkitFontSmoothing: "antialiased" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 13, color: t3, marginBottom: 2 }}>People</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.95)" }}>Payroll</h1>
        </div>
        <div style={{ padding: "6px 12px", borderRadius: 10, background: g1, border: `1px solid ${bds}`, fontSize: 12, fontWeight: 500, color: t2 }}>
          {monthLabel}
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { val: "€28.4K", label: "This Run", color: undefined },
          { val: "142", label: "Employees", color: green },
          { val: "3", label: "Pending", color: amber },
          { val: "€312K", label: "YTD Cost", color: undefined },
        ].map(k => (
          <div key={k.label} style={{ padding: "12px 8px", borderRadius: 14, background: g1, border: `1px solid ${bds}`, textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: k.color ?? "rgba(255,255,255,0.95)" }}>{k.val}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly cost mini-chart */}
      <div style={{ ...card, padding: "14px 14px 10px" }}>
        <TopEdge />
        <p style={{ fontSize: 11, fontWeight: 600, color: t3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Monthly Payroll Cost</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 60, marginBottom: 8 }}>
          {CHART_MONTHS.map(m => (
            <div key={m.label} style={{ flex: 1, borderRadius: "3px 3px 0 0", height: `${m.height}%`, background: m.height === 100 ? "rgba(255,255,255,0.60)" : "rgba(255,255,255,0.20)" }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {CHART_MONTHS.map(m => (
            <div key={m.label} style={{ flex: 1, fontSize: 9, color: t3, textAlign: "center" }}>{m.label}</div>
          ))}
        </div>
      </div>

      {/* Segmented filter */}
      <div style={{ display: "flex", gap: 4, padding: 4, background: g1, border: `1px solid ${bds}`, borderRadius: 12, marginBottom: 14 }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: filter === f ? "rgba(255,255,255,0.95)" : t3, background: filter === f ? g2 : "transparent", border: "none", cursor: "pointer", transition: "all 0.15s" }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Run list */}
      <div style={card}>
        <TopEdge />
        {filteredRuns.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center", color: t3, fontSize: 13 }}>No runs found</div>
        ) : (
          filteredRuns.map((run, i) => (
            <button
              key={run.id}
              onClick={() => setSelectedRun(run)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: i < filteredRuns.length - 1 ? `1px solid ${bds}` : "none", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderRadius: i === 0 ? "18px 18px 0 0" : i === filteredRuns.length - 1 ? "0 0 18px 18px" : 0 }}
            >
              <RunIcon status={run.status} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>{run.title}</div>
                <div style={{ fontSize: 12, color: t3, marginTop: 2 }}>{run.subtitle}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.95)", marginBottom: 4 }}>€{run.amount.toLocaleString()}</div>
                <StatusPill status={run.status} />
              </div>
            </button>
          ))
        )}
      </div>

    </div>
  )
}
