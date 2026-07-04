"use client"

import { useAnomalies, type AnomaliesResponse } from "@/lib/api-hooks"

type Anomaly = AnomaliesResponse["anomalies"][number]

function fmt(v: number, format: string): string {
  if (format === "currency") {
    if (Math.abs(v) >= 1000)
      return `€${(v / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
    return `€${Math.round(v)}`
  }
  if (format === "percent") return `${v}%`
  return v.toLocaleString("en-US")
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: "red" | "amber" }) {
  const color =
    tone === "red"
      ? "rgba(255,120,110,0.92)"
      : tone === "amber"
        ? "rgba(255,190,90,0.92)"
        : undefined
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 18,
        padding: "14px 16px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 560,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 23,
          fontWeight: 680,
          marginTop: 8,
          color: tone && value > 0 ? color : undefined,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Row({ a }: { a: Anomaly }) {
  // Colour by whether the move is bad: critical-unfavourable = red, warning-unfavourable = amber, favourable = neutral.
  const bad = !a.favourable
  const tone = bad && a.severity === "critical" ? "crit" : bad ? "warn" : "fav"
  const border =
    tone === "crit"
      ? "rgba(255,90,80,0.3)"
      : tone === "warn"
        ? "rgba(255,176,64,0.32)"
        : "var(--prv-border)"
  const bg =
    tone === "crit"
      ? "rgba(255,90,80,0.12)"
      : tone === "warn"
        ? "rgba(255,176,64,0.12)"
        : "var(--prv-g1)"
  const accent =
    tone === "crit"
      ? "rgba(255,120,110,0.92)"
      : tone === "warn"
        ? "rgba(255,190,90,0.92)"
        : "var(--prv-text-1)"
  const arrow = a.direction === "up" ? "▲" : a.direction === "down" ? "▼" : "—"
  const badgeLabel = a.favourable
    ? "Favourable"
    : a.severity === "critical"
      ? "Critical"
      : "Warning"
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: 14,
        alignItems: "center",
        padding: "14px 16px",
        border: `1px solid ${border}`,
        background: bg,
        borderRadius: 14,
        marginBottom: 10,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          fontSize: 18,
          width: 22,
          textAlign: "center",
          color: bad ? accent : "var(--prv-text-2)",
        }}
      >
        {arrow}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 560 }}>{a.label}</div>
        <div style={{ color: "var(--prv-text-3)", fontSize: 12, marginTop: 3 }}>
          {fmt(a.previous, a.format)} → {fmt(a.current, a.format)} since yesterday
        </div>
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 660,
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
          color: accent,
        }}
      >
        {a.deltaPct > 0 ? "+" : ""}
        {a.deltaPct}%
      </div>
      <span
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          borderRadius: 6,
          padding: "3px 8px",
          whiteSpace: "nowrap",
          border: `1px solid ${border}`,
          color: bad ? accent : "var(--prv-text-2)",
          background: bad ? bg : "transparent",
        }}
      >
        {badgeLabel}
      </span>
    </div>
  )
}

export function AnomaliesClient() {
  const { data, isLoading } = useAnomalies()
  const anomalies = data?.anomalies ?? []
  const meta = data?.meta

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Anomaly feed</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · sharp day-over-day KPI moves{data?.date ? ` · ${data.date}` : ""}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          margin: "24px 0",
        }}
      >
        <Tile label="Anomalies" value={meta?.total ?? 0} />
        <Tile label="Critical" value={meta?.critical ?? 0} tone="red" />
        <Tile label="Unfavourable" value={meta?.unfavourable ?? 0} tone="amber" />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && anomalies.length === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
          No anomalies — every KPI is within its normal daily range.
        </div>
      )}
      {anomalies.map((a) => (
        <Row key={a.key} a={a} />
      ))}
    </div>
  )
}
