"use client"

import { usePerformance, type PerformanceRow } from "@/lib/api-hooks"

// Monochrome heat with a single green→amber→red signal for the value.
function heatBg(v: number | null): string {
  if (v == null) return "transparent"
  if (v >= 90) return `rgba(48,209,88,${0.1 + (v - 90) / 100})`
  if (v >= 75) return `rgba(255,255,255,${0.06 + (v - 75) / 200})`
  if (v >= 60) return `rgba(255,159,10,${0.1 + (75 - v) / 120})`
  return `rgba(255,69,58,${0.12 + (60 - v) / 160})`
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?"
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: "14px 16px",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginTop: 6 }}>
        {value}
      </div>
    </div>
  )
}

const COLS = "1.7fr repeat(4, 1fr) 0.9fr"

function Cell({
  value,
  suffix = "%",
  bold,
}: {
  value: number | null
  suffix?: string
  bold?: boolean
}) {
  return (
    <div
      style={{
        padding: "14px 8px",
        textAlign: "center",
        fontSize: 13,
        fontWeight: bold ? 800 : 640,
        fontVariantNumeric: "tabular-nums",
        color: value == null ? "var(--prv-text-4)" : "var(--prv-text-1)",
        background: heatBg(value),
      }}
    >
      {value == null ? "—" : `${value}${suffix}`}
    </div>
  )
}

function Heatmap({ rows }: { rows: PerformanceRow[] }) {
  return (
    <div
      style={{
        borderRadius: 22,
        overflow: "hidden",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 1 }}>
        {["Employee", "Attend", "Punctual", "Tasks", "Rating", "Score"].map((h, i) => (
          <div
            key={h}
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--prv-text-3)",
              padding: "11px 8px",
              paddingLeft: i === 0 ? 16 : 8,
              textAlign: i === 0 ? "left" : "center",
            }}
          >
            {h}
          </div>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.userId} style={{ display: "grid", gridTemplateColumns: COLS, gap: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 16px" }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "var(--prv-g2)",
                display: "grid",
                placeItems: "center",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              {initials(r.name)}
            </span>
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 640,
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {r.name}
              </span>
              {r.jobTitle && (
                <span style={{ fontSize: 11, color: "var(--prv-text-3)" }}>{r.jobTitle}</span>
              )}
            </span>
          </div>
          <Cell value={r.attendanceRate} />
          <Cell value={r.punctualityRate} />
          <Cell value={r.taskCompletionRate} />
          <Cell value={r.rating == null ? null : r.rating * 20} suffix="" />
          <Cell value={r.composite} suffix="" bold />
        </div>
      ))}
    </div>
  )
}

export function PerformanceClient() {
  const { data, isLoading } = usePerformance()
  const rows = data?.rows ?? []
  const s = data?.summary

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 4px 60px" }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
        }}
      >
        People · Performance
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 22px" }}>
        Team Performance
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 22,
        }}
      >
        <Stat label="People" value={s?.people ?? 0} />
        <Stat
          label="Avg attendance"
          value={s?.avgAttendance != null ? `${s.avgAttendance}%` : "—"}
        />
        <Stat
          label="Avg punctuality"
          value={s?.avgPunctuality != null ? `${s.avgPunctuality}%` : "—"}
        />
        <Stat label="Avg composite" value={s?.avgComposite != null ? s.avgComposite : "—"} />
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
          margin: "0 4px 12px",
        }}
      >
        Heatmap · employee × metric
      </div>

      {isLoading ? (
        <p style={{ padding: "40px 20px", color: "var(--prv-text-4)" }}>Computing performance…</p>
      ) : rows.length === 0 ? (
        <p
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--prv-text-4)",
            fontSize: 14,
            borderRadius: 22,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
          }}
        >
          No performance data yet for this window. Attendance, tasks and ratings will populate the
          heatmap.
        </p>
      ) : (
        <Heatmap rows={rows} />
      )}
    </div>
  )
}
