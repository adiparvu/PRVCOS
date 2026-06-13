"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Snapshot {
  revenue: { current: number; prev: number; growthPct: number | null; currency: string }
  expenses: { current: number; prev: number; growthPct: number | null }
  profit: { current: number; prev: number; marginPct: number }
  activeProjects: number
  totalTasks: number
  urgentTasks: number
  inProgressTasks: number
  doneTasks: number
  activeEmployees: number
  pendingLeave: number
  openInvoices: number
  overdueInvoices: number
  overdueAmount: number
  vatDue: number
}

interface Alert {
  id: string
  severity: "critical" | "warning" | "info"
  title: string
  description: string
  count: number
  actionPath: string
}

interface SummaryData {
  snapshot: Snapshot
  alerts: Alert[]
  generatedAt: string
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return Math.round(n).toString()
}

function GrowthChip({ pct }: { pct: number | null }) {
  if (pct === null) return null
  const positive = pct >= 0
  const color = positive ? "rgba(48,209,88,0.95)" : "rgba(255,69,58,0.95)"
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        background: color.replace(/[\d.]+\)$/, "0.12)"),
        border: `1px solid ${color.replace(/[\d.]+\)$/, "0.28)")}`,
        borderRadius: 8,
        padding: "2px 6px",
      }}
    >
      {positive ? "+" : ""}
      {pct}%
    </span>
  )
}

const SEVERITY_COLOR = {
  critical: "rgba(255,69,58,0.95)",
  warning: "rgba(255,159,10,0.95)",
  info: "rgba(10,132,255,0.9)",
}

function AlertItem({ alert }: { alert: Alert }) {
  const color = SEVERITY_COLOR[alert.severity]
  return (
    <Link href={alert.actionPath} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "11px 14px",
          background: color.replace(/[\d.]+\)$/, "0.07)"),
          border: `1px solid ${color.replace(/[\d.]+\)$/, "0.20)")}`,
          borderRadius: 12,
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 6px ${color}`,
            marginTop: 4,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color,
              marginBottom: 2,
              letterSpacing: "-0.1px",
            }}
          >
            {alert.title}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.4,
            }}
          >
            {alert.description}
          </div>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.30)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginTop: 2, flexShrink: 0 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  )
}

function StatRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 400 }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.90)", fontWeight: 600 }}>
          {value}
        </span>
        {sub && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{sub}</span>}
      </div>
    </div>
  )
}

function Skeleton({ h = 20, w = "100%", r = 8 }: { h?: number; w?: number | string; r?: number }) {
  return (
    <div
      style={{
        height: h,
        width: w,
        borderRadius: r,
        background: "rgba(255,255,255,0.06)",
        animation: "pulse 1.4s ease-in-out infinite",
      }}
    />
  )
}

export function ExecutiveSummaryPanel() {
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard/executive-summary")
      .then((r) => r.json())
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Skeleton h={100} r={16} />
        <Skeleton h={60} r={12} />
        <Skeleton h={60} r={12} />
      </div>
    )
  }

  if (!data) return null

  const { snapshot: s, alerts } = data

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* KPI Grid — Revenue, Profit, Employees, Projects */}
      <div style={{ display: "flex", gap: 8 }}>
        {/* Revenue */}
        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 16,
            padding: "14px 12px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
            }}
          />
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              letterSpacing: "-0.5px",
            }}
          >
            {fmt(s.revenue.current)}{" "}
            <span style={{ fontSize: 13, opacity: 0.55, fontWeight: 500 }}>
              {s.revenue.currency}
            </span>
          </span>
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              fontWeight: 500,
              letterSpacing: 0.2,
            }}
          >
            VENITURI
          </span>
          <div style={{ marginTop: 2 }}>
            <GrowthChip pct={s.revenue.growthPct} />
          </div>
        </div>

        {/* Profit */}
        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 16,
            padding: "14px 12px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
            }}
          />
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: s.profit.current >= 0 ? "rgba(48,209,88,0.95)" : "rgba(255,69,58,0.95)",
              letterSpacing: "-0.5px",
            }}
          >
            {fmt(s.profit.current)}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              fontWeight: 500,
              letterSpacing: 0.2,
            }}
          >
            PROFIT NET
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            {s.profit.marginPct}% marjă
          </span>
        </div>
      </div>

      {/* Second row */}
      <div style={{ display: "flex", gap: 8 }}>
        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 16,
            padding: "14px 12px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
            }}
          />
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "rgba(255,255,255,0.90)",
              letterSpacing: "-0.5px",
            }}
          >
            {s.activeProjects}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              fontWeight: 500,
              letterSpacing: 0.2,
            }}
          >
            PROIECTE ACTIVE
          </span>
        </div>

        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 16,
            padding: "14px 12px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
            }}
          />
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "rgba(255,255,255,0.90)",
              letterSpacing: "-0.5px",
            }}
          >
            {s.activeEmployees}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              fontWeight: 500,
              letterSpacing: 0.2,
            }}
          >
            ANGAJAȚI ACTIVI
          </span>
        </div>
      </div>

      {/* Operational detail rows */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: "4px 16px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)",
          }}
        />
        <StatRow label="Sarcini totale" value={s.totalTasks} />
        <StatRow
          label="Urgente nerezolvate"
          value={s.urgentTasks}
          sub={s.urgentTasks > 0 ? "⚠" : undefined}
        />
        <StatRow label="În lucru" value={s.inProgressTasks} />
        <StatRow
          label="Facturi restante"
          value={s.overdueInvoices}
          sub={s.overdueAmount > 0 ? `${fmt(s.overdueAmount)} RON` : undefined}
        />
        <StatRow label="Concedii în așteptare" value={s.pendingLeave} />
        <StatRow label="TVA de plată (est.)" value={`${fmt(s.vatDue)} RON`} />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              paddingLeft: 2,
            }}
          >
            Alerte active
          </span>
          {alerts.map((a) => (
            <AlertItem key={a.id} alert={a} />
          ))}
        </div>
      )}
    </div>
  )
}
