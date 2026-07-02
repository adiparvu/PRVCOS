"use client"

import { useCrmAnalytics } from "@/lib/api-hooks"
import type { CrmAnalytics } from "@/app/api/crm/analytics/route"

const STAGE_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
}
const SOURCE_LABEL: Record<string, string> = {
  website: "Website",
  referral: "Referral",
  cold_call: "Cold call",
  social: "Social",
  event: "Event",
  partner: "Partner",
}

function eur(n: number): string {
  if (n >= 1000) return `€${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
  return `€${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (name === "Unassigned") return "—"
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "—").toUpperCase()
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase()
}
function weekLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00Z")
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", timeZone: "UTC" })
}

const card = {
  background: "var(--prv-g1)",
  border: "1px solid var(--prv-border)",
  borderRadius: 22,
  padding: "20px 22px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 64px rgba(0,0,0,0.5)",
} as const

function Kpi({
  label,
  value,
  unit,
  foot,
}: {
  label: string
  value: string
  unit?: string
  foot: string
}) {
  return (
    <div style={card}>
      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 11.5,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 560,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 660, letterSpacing: "-0.02em", marginTop: 12 }}>
        {value}
        {unit && (
          <span
            style={{ fontSize: 15, color: "var(--prv-text-3)", fontWeight: 500, marginLeft: 2 }}
          >
            {unit}
          </span>
        )}
      </div>
      <div style={{ color: "var(--prv-text-2)", fontSize: 12, marginTop: 8 }}>{foot}</div>
    </div>
  )
}

function CardHead({ title, meta }: { title: string; meta: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 18,
      }}
    >
      <h2 style={{ fontSize: 15, fontWeight: 600 }}>{title}</h2>
      <div style={{ color: "var(--prv-text-3)", fontSize: 12 }}>{meta}</div>
    </div>
  )
}

function Funnel({ data }: { data: CrmAnalytics["byStage"] }) {
  const max = Math.max(1, ...data.map((s) => s.count))
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((s) => {
        const won = s.stage === "won"
        const lost = s.stage === "lost"
        return (
          <div
            key={s.stage}
            style={{
              display: "grid",
              gridTemplateColumns: "96px 1fr auto",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div style={{ color: "var(--prv-text-2)", fontSize: 12.5 }}>{STAGE_LABEL[s.stage]}</div>
            <div
              style={{
                height: 30,
                borderRadius: 9,
                background: "var(--prv-g2)",
                border: "1px solid var(--prv-border-subtle)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <i
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${(s.count / max) * 100}%`,
                  background: lost
                    ? "repeating-linear-gradient(45deg,rgba(255,255,255,.10),rgba(255,255,255,.10) 6px,rgba(255,255,255,.04) 6px,rgba(255,255,255,.04) 12px)"
                    : won
                      ? "linear-gradient(90deg,rgba(255,255,255,.34),rgba(255,255,255,.16))"
                      : "linear-gradient(90deg,rgba(255,255,255,.22),rgba(255,255,255,.10))",
                  borderRight: "1px solid rgba(255,255,255,.28)",
                }}
              />
            </div>
            <div
              style={{
                fontVariantNumeric: "tabular-nums",
                fontSize: 13,
                minWidth: 82,
                textAlign: "right",
              }}
            >
              <b style={{ fontWeight: 620 }}>{s.count}</b>{" "}
              <span style={{ color: "var(--prv-text-3)", fontSize: 11.5 }}>· {eur(s.value)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Sources({ data }: { data: CrmAnalytics["bySource"] }) {
  const max = Math.max(1, ...data.map((s) => s.won))
  const visible = data.filter((s) => s.count > 0 || s.won > 0)
  const rows = visible.length ? visible : data
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.map((s) => (
        <div key={s.source} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ color: "var(--prv-text-2)" }}>{SOURCE_LABEL[s.source]}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{eur(s.won)}</span>
          </div>
          <div
            style={{
              height: 7,
              borderRadius: 100,
              background: "var(--prv-g2)",
              overflow: "hidden",
            }}
          >
            <i
              style={{
                display: "block",
                height: "100%",
                borderRadius: 100,
                width: `${(s.won / max) * 100}%`,
                background: "linear-gradient(90deg,rgba(255,255,255,.30),rgba(255,255,255,.14))",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function Velocity({ data }: { data: CrmAnalytics["velocity"] }) {
  const max = Math.max(1, ...data.map((b) => b.count))
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120, paddingTop: 10 }}>
      {data.map((b) => (
        <div
          key={b.weekStart}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            height: "100%",
            justifyContent: "flex-end",
          }}
        >
          <i
            style={{
              width: "100%",
              maxWidth: 34,
              height: `${Math.max(4, (b.count / max) * 100)}%`,
              borderRadius: "8px 8px 3px 3px",
              background: "linear-gradient(180deg,rgba(255,255,255,.26),rgba(255,255,255,.08))",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            }}
          />
          <span
            style={{ color: "var(--prv-text-2)", fontSize: 11, fontVariantNumeric: "tabular-nums" }}
          >
            {b.count}
          </span>
          <span style={{ color: "var(--prv-text-3)", fontSize: 10.5 }}>
            {weekLabel(b.weekStart)}
          </span>
        </div>
      ))}
    </div>
  )
}

function TopReps({ data }: { data: CrmAnalytics["topReps"] }) {
  if (data.length === 0) {
    return <div style={{ color: "var(--prv-text-3)", fontSize: 13 }}>No won deals yet.</div>
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {data.slice(0, 6).map((r, i) => (
        <div
          key={r.rep}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 13,
            padding: "11px 6px",
            borderBottom:
              i === Math.min(data.length, 6) - 1 ? "0" : "1px solid var(--prv-border-subtle)",
          }}
        >
          <div style={{ color: "var(--prv-text-3)", fontSize: 12, width: 16, textAlign: "center" }}>
            {i + 1}
          </div>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "var(--prv-g3)",
              border: "1px solid var(--prv-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 600,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
            }}
          >
            {initials(r.rep)}
          </div>
          <div style={{ flex: 1, fontSize: 13 }}>
            {r.rep}
            <span
              style={{ display: "block", color: "var(--prv-text-3)", fontSize: 11, marginTop: 2 }}
            >
              {r.wonCount} {r.wonCount === 1 ? "deal" : "deals"} won
            </span>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {eur(r.wonValue)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function CrmAnalyticsClient() {
  const { data, isLoading, isError } = useCrmAnalytics()

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "36px 24px 80px" }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 30, fontWeight: 640, letterSpacing: "-0.02em" }}>Sales Analytics</h1>
        <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
          CRM · pipeline performance across every lead source and rep
        </div>
      </div>

      {isLoading && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading analytics…</div>
      )}
      {isError && (
        <div style={{ color: "var(--prv-text-2)", fontSize: 14 }}>Could not load analytics.</div>
      )}

      {data && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <Kpi
              label="Weighted pipeline"
              value={eur(data.weightedPipelineValue)}
              foot={`${eur(data.pipelineValue)} unweighted`}
            />
            <Kpi
              label="Win rate"
              value={String(data.winRate)}
              unit="%"
              foot={`${data.wonCount} won · ${data.lostCount} lost`}
            />
            <Kpi
              label="Avg deal size"
              value={eur(data.avgDealSize)}
              foot={`over ${data.wonCount} won ${data.wonCount === 1 ? "deal" : "deals"}`}
            />
            <Kpi
              label="Avg sales cycle"
              value={String(data.avgSalesCycleDays)}
              unit="d"
              foot="new → closed"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16 }}>
            <div style={card}>
              <CardHead title="Conversion funnel" meta={`${data.totalLeads} leads total`} />
              <Funnel data={data.byStage} />
            </div>
            <div style={card}>
              <CardHead title="Revenue by source" meta="won value" />
              <Sources data={data.bySource} />
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, marginTop: 16 }}
          >
            <div style={card}>
              <CardHead title="Lead velocity" meta="new leads / week" />
              <Velocity data={data.velocity} />
            </div>
            <div style={card}>
              <CardHead title="Top performers" meta="by won value" />
              <TopReps data={data.topReps} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
