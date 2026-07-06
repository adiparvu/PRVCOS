"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import {
  useKpiTrends,
  useAnomalies,
  useCompanyHealth,
  useProjectProfitability,
  useSafetyAnalytics,
  useAttendanceAnalytics,
  useDemandForecast,
} from "@/lib/api-hooks"
import { scoreLabel, cockpitPosture, cockpitBriefing, type Tone } from "@/lib/command-center"

function eur(n: number): string {
  if (Math.abs(n) >= 1000)
    return `€${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
  return `€${Math.round(n)}`
}

const CHIP: Record<Tone, { color: string; border: string; background: string }> = {
  good: {
    color: "var(--prv-text-1)",
    border: "1px solid rgba(255,255,255,0.28)",
    background: "var(--prv-g3)",
  },
  amber: {
    color: "rgba(255,190,90,0.92)",
    border: "1px solid rgba(255,176,64,0.32)",
    background: "rgba(255,176,64,0.1)",
  },
  red: {
    color: "rgba(255,105,97,0.95)",
    border: "1px solid rgba(255,105,97,0.36)",
    background: "rgba(255,105,97,0.12)",
  },
}

const DOT: Record<Tone, string> = {
  good: "rgba(255,255,255,0.85)",
  amber: "rgba(255,190,90,0.92)",
  red: "rgba(255,105,97,0.95)",
}

function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 9.5,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        borderRadius: 5,
        padding: "2px 7px",
        marginLeft: "auto",
        ...CHIP[tone],
      }}
    >
      {children}
    </span>
  )
}

function Panel({
  href,
  label,
  value,
  sub,
  chip,
  valueTone,
}: {
  href: string
  label: string
  value: ReactNode
  sub: ReactNode
  chip?: { tone: Tone; text: string }
  valueTone?: Tone
}) {
  return (
    <Link
      href={href}
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 20,
        padding: "16px 17px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 64px rgba(0,0,0,0.4)",
        minHeight: 118,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 560,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {label}
        {chip && <Chip tone={chip.tone}>{chip.text}</Chip>}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginTop: 4,
          color:
            valueTone === "amber"
              ? "rgba(255,190,90,0.92)"
              : valueTone === "red"
                ? "rgba(255,105,97,0.95)"
                : undefined,
        }}
      >
        {value}
      </div>
      <div style={{ color: "var(--prv-text-2)", fontSize: 12, marginTop: "auto" }}>{sub}</div>
    </Link>
  )
}

export function CommandCenterClient() {
  const health = useCompanyHealth().data
  const trends = useKpiTrends().data
  const profit = useProjectProfitability().data
  const attendance = useAttendanceAnalytics().data
  const safety = useSafetyAnalytics().data
  const anomalies = useAnomalies().data
  const demand = useDemandForecast().data

  const healthScore = health?.composite ?? 0
  const criticalAlerts = anomalies?.meta.critical ?? 0
  const openSafetyCritical = safety?.riskBand === "critical"
  const stockoutRisk = demand?.criticalCount ?? 0
  const attendanceWatch = attendance?.watchlist.length ?? 0

  const posture = cockpitPosture({
    healthScore,
    criticalAlerts,
    openSafetyCritical,
    stockoutRisk,
    attendanceWatch,
  })
  const briefing = cockpitBriefing({
    healthScore,
    criticalAlerts,
    openSafetyCritical,
    stockoutRisk,
    attendanceWatch,
  })

  const revenue = trends?.trends.find((t) => t.key === "revenueMonth")
  const healthBand = scoreLabel(healthScore)

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Command Center</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Executive Cockpit · everything at a glance · read-only
      </div>

      <div
        style={{
          margin: "20px 0 6px",
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border)",
          borderRadius: 18,
          padding: "16px 20px",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: DOT[posture.tone],
            boxShadow: `0 0 12px ${DOT[posture.tone]}`,
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ fontSize: 15, fontWeight: 620 }}>{posture.label}</div>
          <div style={{ color: "var(--prv-text-2)", fontSize: 13 }}>{briefing}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginTop: 16,
        }}
      >
        <Panel
          href="/analytics/health"
          label="Company Health"
          chip={{ tone: healthBand.tone, text: healthBand.label }}
          value={
            <>
              {Math.round(healthScore)}
              <span style={{ fontSize: 13, color: "var(--prv-text-3)", fontWeight: 560 }}>
                /100
              </span>
            </>
          }
          sub={`Composite · ${health?.domains.length ?? 0} domains`}
        />
        <Panel
          href="/analytics/trends"
          label="Revenue Pulse"
          value={revenue ? eur(revenue.current) : "—"}
          valueTone={revenue && revenue.direction === "down" ? "amber" : undefined}
          sub={
            revenue
              ? `${revenue.direction === "down" ? "▼" : "▲"} ${Math.abs(revenue.deltaPct)}% vs window start`
              : "No trend data"
          }
        />
        <Panel
          href="/analytics/project-profitability"
          label="Operations"
          value={profit?.projects.length ?? 0}
          sub={`Active projects · ${profit?.lossCount ?? 0} loss-making`}
        />
        <Panel
          href="/analytics/project-profitability"
          label="Financial"
          value={eur(profit?.totalProfit ?? 0)}
          valueTone={profit && profit.totalProfit < 0 ? "red" : undefined}
          sub={`Portfolio profit · ${profit?.marginPct ?? 0}% margin`}
        />
        <Panel
          href="/analytics/attendance"
          label="Workforce"
          chip={
            attendanceWatch > 0 ? { tone: "amber", text: `${attendanceWatch} watch` } : undefined
          }
          value={
            <>
              {attendance?.attendanceRate ?? 0}
              <span style={{ fontSize: 13, color: "var(--prv-text-3)", fontWeight: 560 }}>%</span>
            </>
          }
          sub={`Attendance · ${attendanceWatch} on watchlist`}
        />
        <Panel
          href="/analytics/safety"
          label="Safety"
          chip={
            safety && safety.riskBand !== "stable"
              ? { tone: safety.riskBand === "critical" ? "red" : "amber", text: safety.riskBand }
              : undefined
          }
          value={safety?.open ?? 0}
          valueTone={openSafetyCritical ? "red" : undefined}
          sub={`Open incidents · risk ${safety?.riskIndex ?? 0}`}
        />
        <Panel
          href="/analytics/anomalies"
          label="Alert Triage"
          chip={criticalAlerts > 0 ? { tone: "red", text: String(criticalAlerts) } : undefined}
          value={anomalies?.meta.total ?? 0}
          sub={`Anomalies · ${criticalAlerts} critical`}
        />
        <Panel
          href="/analytics/demand-forecast"
          label="Inventory"
          chip={stockoutRisk > 0 ? { tone: "red", text: String(stockoutRisk) } : undefined}
          value={stockoutRisk}
          valueTone={stockoutRisk > 0 ? "red" : undefined}
          sub={`Stockout risk · ${demand?.reorderCount ?? 0} to reorder`}
        />
      </div>
    </div>
  )
}
