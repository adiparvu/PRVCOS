"use client"

import { useAttendanceAnalytics, type AttendanceAnalyticsResponse } from "@/lib/api-hooks"

type WatchRow = AttendanceAnalyticsResponse["watchlist"][number]

const STATUS_ROWS: { key: "present" | "late" | "absent" | "leave"; label: string }[] = [
  { key: "present", label: "Present" },
  { key: "late", label: "Late" },
  { key: "absent", label: "Absent" },
  { key: "leave", label: "On leave" },
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "—").toUpperCase()
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase()
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: "amber" | "red"
}) {
  const positive = typeof value === "number" ? value > 0 : true
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
            tone === "red" && positive
              ? "rgba(255,105,97,0.95)"
              : tone === "amber" && positive
                ? "rgba(255,190,90,0.92)"
                : undefined,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border)",
        borderRadius: 22,
        padding: "18px 20px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 64px rgba(0,0,0,0.5)",
      }}
    >
      <h2
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--prv-text-3)",
          fontWeight: 560,
          marginBottom: 14,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function StatusBar({
  label,
  kind,
  count,
  max,
}: {
  label: string
  kind: "present" | "late" | "absent" | "leave"
  count: number
  max: number
}) {
  const pct = max > 0 ? Math.max(count > 0 ? 5 : 0, (count / max) * 100) : 0
  const fill =
    kind === "absent"
      ? "rgba(255,105,97,0.95)"
      : kind === "late"
        ? "rgba(255,190,90,0.92)"
        : "rgba(255,255,255,0.5)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
      <div style={{ width: 86, fontSize: 13, color: "var(--prv-text-2)" }}>{label}</div>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 99,
          background: "var(--prv-g3)",
          overflow: "hidden",
        }}
      >
        <div style={{ height: "100%", borderRadius: 99, background: fill, width: `${pct}%` }} />
      </div>
      <div
        style={{ width: 30, textAlign: "right", fontSize: 13, fontVariantNumeric: "tabular-nums" }}
      >
        {count}
      </div>
    </div>
  )
}

function WatchBadge({ band }: { band: string }) {
  const style =
    band === "poor"
      ? {
          color: "rgba(255,105,97,0.95)",
          border: "1px solid rgba(255,105,97,0.36)",
          background: "rgba(255,105,97,0.12)",
          label: "Poor",
        }
      : {
          color: "rgba(255,190,90,0.92)",
          border: "1px solid rgba(255,176,64,0.32)",
          background: "rgba(255,176,64,0.1)",
          label: "Watch",
        }
  const { label, ...css } = style
  return (
    <span
      style={{
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        borderRadius: 6,
        padding: "3px 8px",
        ...css,
      }}
    >
      {label}
    </span>
  )
}

function WatchItem({ e, last }: { e: WatchRow; last: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: last ? "0" : "1px solid var(--prv-border-subtle)",
        fontSize: 13.5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--prv-g3)",
            border: "1px solid var(--prv-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10.5,
            fontWeight: 600,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
          }}
        >
          {initials(e.name)}
        </div>
        <div>{e.name}</div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span
          style={{ color: "var(--prv-text-3)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}
        >
          {e.attendanceRate}%
        </span>
        <WatchBadge band={e.band} />
      </div>
    </div>
  )
}

export function AttendanceAnalyticsClient() {
  const { data, isLoading } = useAttendanceAnalytics()
  const byStatus = data?.byStatus ?? { present: 0, late: 0, absent: 0, leave: 0, clocked_out: 0 }
  const presentTotal = byStatus.present + byStatus.clocked_out
  const maxBar = Math.max(1, presentTotal, byStatus.late, byStatus.absent, byStatus.leave)
  const watchlist = data?.watchlist ?? []

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>
        Attendance Analytics
      </h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · workforce domain · attendance &amp; punctuality · last {data?.periodDays ?? 30}{" "}
        days
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile
          label="Attendance"
          value={`${data?.attendanceRate ?? 0}%`}
          tone={
            data && data.band === "poor"
              ? "red"
              : data && data.band === "watch"
                ? "amber"
                : undefined
          }
        />
        <Tile label="Punctuality" value={`${data?.punctualityRate ?? 0}%`} />
        <Tile label="Absenteeism" value={`${data?.absenteeismRate ?? 0}%`} tone="amber" />
        <Tile
          label="Avg late"
          value={
            data?.avgLateMinutes === null || data?.avgLateMinutes === undefined
              ? "—"
              : `${data.avgLateMinutes} min`
          }
          tone="amber"
        />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && (data?.total ?? 0) === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No attendance records yet.</div>
      )}

      {(data?.total ?? 0) > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Status mix">
            <StatusBar label="Present" kind="present" count={presentTotal} max={maxBar} />
            <StatusBar label="Late" kind="late" count={byStatus.late} max={maxBar} />
            <StatusBar label="Absent" kind="absent" count={byStatus.absent} max={maxBar} />
            <StatusBar label="On leave" kind="leave" count={byStatus.leave} max={maxBar} />
          </Card>
          <Card title="Watchlist">
            {watchlist.length === 0 ? (
              <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, padding: "8px 0" }}>
                Everyone at or above 95% attendance.
              </div>
            ) : (
              watchlist.map((e, i) => (
                <WatchItem key={e.userId} e={e} last={i === watchlist.length - 1} />
              ))
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
