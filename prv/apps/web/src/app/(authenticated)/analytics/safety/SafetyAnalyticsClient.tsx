"use client"

import { useSafetyAnalytics, type SafetyAnalyticsResponse } from "@/lib/api-hooks"

type Severity = "low" | "medium" | "high" | "critical"

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"]
const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
}
const RISK_BAND: Record<string, { label: string; tone: "red" | "amber" | "plain" }> = {
  critical: { label: "Critical", tone: "red" },
  elevated: { label: "Elevated", tone: "amber" },
  stable: { label: "Stable", tone: "plain" },
}
const TYPE_LABEL: Record<string, string> = {
  accident: "Accident",
  near_miss: "Near miss",
  hazard: "Hazard",
  property_damage: "Property damage",
  environmental: "Environmental",
  security: "Security",
}

function Tile({
  label,
  value,
  tone,
  badge,
}: {
  label: string
  value: string | number
  tone?: "amber" | "red"
  badge?: React.ReactNode
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
          display: "flex",
          alignItems: "center",
          gap: 8,
          color:
            tone === "red" && positive
              ? "rgba(255,105,97,0.95)"
              : tone === "amber" && positive
                ? "rgba(255,190,90,0.92)"
                : undefined,
        }}
      >
        {value}
        {badge}
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

function SeverityBar({ sev, count, max }: { sev: Severity; count: number; max: number }) {
  const pct = max > 0 ? Math.max(count > 0 ? 6 : 0, (count / max) * 100) : 0
  const fill =
    sev === "critical"
      ? "rgba(255,105,97,0.95)"
      : sev === "high"
        ? "rgba(255,190,90,0.92)"
        : "rgba(255,255,255,0.5)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
      <div style={{ width: 74, fontSize: 13, color: "var(--prv-text-2)" }}>
        {SEVERITY_LABEL[sev]}
      </div>
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
        style={{
          width: 22,
          textAlign: "right",
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {count}
      </div>
    </div>
  )
}

function RiskBadge({ band }: { band: string }) {
  const b = RISK_BAND[band] ?? RISK_BAND.stable!
  if (b.tone === "plain") return null
  const style =
    b.tone === "red"
      ? {
          color: "rgba(255,105,97,0.95)",
          border: "1px solid rgba(255,105,97,0.36)",
          background: "rgba(255,105,97,0.12)",
        }
      : {
          color: "rgba(255,190,90,0.92)",
          border: "1px solid rgba(255,176,64,0.32)",
          background: "rgba(255,176,64,0.1)",
        }
  return (
    <span
      style={{
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        borderRadius: 6,
        padding: "3px 9px",
        ...style,
      }}
    >
      {b.label}
    </span>
  )
}

export function SafetyAnalyticsClient() {
  const { data, isLoading } = useSafetyAnalytics()
  const bySeverity = data?.bySeverity ?? { low: 0, medium: 0, high: 0, critical: 0 }
  const maxSev = Math.max(1, ...SEVERITY_ORDER.map((s) => bySeverity[s]))
  const byType = data?.byType ?? []

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Safety Analytics</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · safety domain · incident intelligence
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Incidents" value={data?.total ?? 0} />
        <Tile label="Open" value={data?.open ?? 0} tone="amber" />
        <Tile
          label="Risk index"
          value={data?.riskIndex ?? 0}
          tone={
            data?.riskBand === "critical"
              ? "red"
              : data?.riskBand === "elevated"
                ? "amber"
                : undefined
          }
          badge={data ? <RiskBadge band={data.riskBand} /> : null}
        />
        <Tile label="Injuries" value={data?.injuriesTotal ?? 0} tone="red" />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && (data?.total ?? 0) === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No incidents recorded.</div>
      )}

      {(data?.total ?? 0) > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Severity mix">
            {SEVERITY_ORDER.map((s) => (
              <SeverityBar key={s} sev={s} count={bySeverity[s]} max={maxSev} />
            ))}
            <div style={{ marginTop: 16, display: "flex", gap: 24 }}>
              <div>
                <div
                  style={{
                    color: "var(--prv-text-3)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Resolution rate
                </div>
                <div style={{ fontSize: 20, fontWeight: 660, marginTop: 5 }}>
                  {data?.resolutionRate ?? 0}%
                </div>
              </div>
              <div>
                <div
                  style={{
                    color: "var(--prv-text-3)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Mean time to resolve
                </div>
                <div style={{ fontSize: 20, fontWeight: 660, marginTop: 5 }}>
                  {data?.mttrDays === null || data?.mttrDays === undefined ? "—" : data.mttrDays}{" "}
                  <span style={{ fontSize: 12, color: "var(--prv-text-3)" }}>days</span>
                </div>
              </div>
            </div>
          </Card>
          <Card title="By type">
            {byType.map((t, i) => (
              <div
                key={t.type}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "9px 0",
                  borderBottom:
                    i === byType.length - 1 ? "0" : "1px solid var(--prv-border-subtle)",
                  fontSize: 13.5,
                }}
              >
                <div>{TYPE_LABEL[t.type] ?? t.type}</div>
                <div style={{ color: "var(--prv-text-2)", fontVariantNumeric: "tabular-nums" }}>
                  {t.count}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
