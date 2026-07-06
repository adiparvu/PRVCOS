"use client"

import Link from "next/link"
import {
  useAnomalies,
  useCompanyHealth,
  useProjectProfitability,
  useSafetyAnalytics,
  useAttendanceAnalytics,
  useDemandForecast,
} from "@/lib/api-hooks"
import { buildInsights, summarizeInsights, type Insight } from "@/lib/insights"

function Tile({ label, value, tone }: { label: string; value: number; tone?: "amber" | "red" }) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 18,
        padding: "15px 17px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          fontWeight: 560,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 680,
          marginTop: 8,
          letterSpacing: "-0.02em",
          color:
            tone === "red" && value > 0
              ? "rgba(255,105,97,0.95)"
              : tone === "amber" && value > 0
                ? "rgba(255,190,90,0.92)"
                : undefined,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function InsightCard({ ins }: { ins: Insight }) {
  const rail =
    ins.severity === "critical"
      ? "rgba(255,105,97,0.95)"
      : ins.severity === "warning"
        ? "rgba(255,190,90,0.92)"
        : "var(--prv-text-3)"
  const sev =
    ins.severity === "critical"
      ? {
          color: "rgba(255,105,97,0.95)",
          border: "1px solid rgba(255,105,97,0.36)",
          background: "rgba(255,105,97,0.12)",
          label: "Critical",
        }
      : ins.severity === "warning"
        ? {
            color: "rgba(255,190,90,0.92)",
            border: "1px solid rgba(255,176,64,0.32)",
            background: "rgba(255,176,64,0.1)",
            label: "Warning",
          }
        : {
            color: "var(--prv-text-3)",
            border: "1px solid var(--prv-border)",
            background: "transparent",
            label: "Info",
          }
  const { label, ...sevCss } = sev
  return (
    <Link
      href={ins.href}
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 16,
        padding: "15px 17px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <span
        style={{
          width: 3,
          alignSelf: "stretch",
          borderRadius: 99,
          background: rail,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>{ins.title}</h3>
        <p style={{ color: "var(--prv-text-3)", fontSize: 12.5, marginTop: 3, lineHeight: 1.5 }}>
          {ins.detail}
        </p>
      </div>
      <span
        style={{
          fontSize: 9.5,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          borderRadius: 5,
          padding: "2px 8px",
          whiteSpace: "nowrap",
          flexShrink: 0,
          ...sevCss,
        }}
      >
        {label}
      </span>
      <span style={{ color: "var(--prv-text-3)", fontSize: 15, alignSelf: "center" }}>›</span>
    </Link>
  )
}

export function InsightsClient() {
  const health = useCompanyHealth().data
  const profit = useProjectProfitability().data
  const attendance = useAttendanceAnalytics().data
  const safety = useSafetyAnalytics().data
  const anomalies = useAnomalies().data
  const demand = useDemandForecast().data

  const insights = buildInsights({
    healthScore: health?.composite ?? 100,
    projects: (profit?.projects ?? []).map((p) => ({
      name: p.name,
      band: p.band,
      profit: p.profit,
      marginPct: p.marginPct,
      budgetUsedPct: p.budgetUsedPct,
    })),
    attendanceWatch: (attendance?.watchlist ?? []).map((w) => ({
      name: w.name,
      attendanceRate: w.attendanceRate,
      band: w.band,
    })),
    safety: {
      open: safety?.open ?? 0,
      riskBand: safety?.riskBand ?? "stable",
      riskIndex: safety?.riskIndex ?? 0,
      injuries: safety?.injuriesTotal ?? 0,
    },
    anomalies: (anomalies?.anomalies ?? []).map((a) => ({
      label: a.label,
      deltaPct: a.deltaPct,
      severity: a.severity,
      favourable: a.favourable,
    })),
    demand: (demand?.products ?? []).map((d) => ({
      name: d.name,
      band: d.band,
      daysOfCover: d.daysOfCover,
      suggestedReorderQty: d.suggestedReorderQty,
    })),
  })
  const summary = summarizeInsights(insights)

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Insights</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Command Center · rule-based · what needs your attention
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Insights" value={summary.total} />
        <Tile label="Critical" value={summary.critical} tone="red" />
        <Tile label="Warnings" value={summary.warning} tone="amber" />
      </div>

      {insights.length === 0 ? (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
          No insights — everything is within thresholds.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {insights.map((ins) => (
            <InsightCard key={ins.id} ins={ins} />
          ))}
        </div>
      )}
    </div>
  )
}
