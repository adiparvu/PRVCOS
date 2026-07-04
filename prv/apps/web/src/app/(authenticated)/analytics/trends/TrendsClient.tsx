"use client"

import { useKpiTrends, type TrendsResponse } from "@/lib/api-hooks"

type Trend = TrendsResponse["trends"][number]

function fmtValue(v: number, format: string): string {
  if (format === "currency") {
    if (Math.abs(v) >= 1000)
      return `€${(v / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
    return `€${Math.round(v)}`
  }
  if (format === "percent") return `${v}%`
  return v.toLocaleString("en-US")
}

// Build an SVG polyline points string, normalized into a 100x40 box.
function sparkPoints(series: number[]): string {
  if (series.length === 0) return ""
  if (series.length === 1) return "0,20 100,20"
  const min = Math.min(...series)
  const max = Math.max(...series)
  const span = max - min || 1
  const n = series.length - 1
  return series
    .map((v, i) => {
      const x = (i / n) * 100
      const y = 36 - ((v - min) / span) * 32 // 4..36 padded
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
}

function Card({ t }: { t: Trend }) {
  const stroke =
    t.direction === "flat"
      ? "rgba(255,255,255,0.3)"
      : t.positive
        ? "rgba(255,255,255,0.6)"
        : "rgba(255,190,90,0.92)"
  const deltaColor =
    t.direction === "flat"
      ? "var(--prv-text-3)"
      : t.positive
        ? "var(--prv-text-1)"
        : "rgba(255,190,90,0.92)"
  const arrow = t.direction === "up" ? "▲" : t.direction === "down" ? "▼" : "—"
  const deltaText =
    t.direction === "flat"
      ? "no change"
      : `${arrow} ${Math.abs(t.deltaPct)}%${t.positive ? "" : ""}`
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 20,
        padding: 18,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 64px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 560,
        }}
      >
        {t.label}
      </div>
      <div style={{ fontSize: 25, fontWeight: 680, marginTop: 10, letterSpacing: "-0.02em" }}>
        {fmtValue(t.current, t.format)}
      </div>
      <div style={{ fontSize: 12.5, marginTop: 6, color: deltaColor }}>{deltaText}</div>
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        style={{ marginTop: 14, height: 40, width: "100%" }}
      >
        <polyline
          points={sparkPoints(t.sparkline)}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export function TrendsClient() {
  const { data, isLoading, isError } = useKpiTrends()
  const trends = data?.trends ?? []
  const hasData = trends.some((t) => t.sparkline.length > 0)

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>KPI trends</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · last {data?.windowDays ?? 30} days · period-over-period comparison
      </div>

      {isLoading && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14, marginTop: 24 }}>Loading…</div>
      )}
      {isError && (
        <div style={{ color: "var(--prv-text-2)", fontSize: 14, marginTop: 24 }}>
          Could not load trends.
        </div>
      )}
      {data && !hasData && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14, marginTop: 24 }}>
          No KPI snapshots yet — trends appear once daily snapshots are recorded.
        </div>
      )}

      {data && hasData && (
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 24 }}
        >
          {trends.map((t) => (
            <Card key={t.key} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}
