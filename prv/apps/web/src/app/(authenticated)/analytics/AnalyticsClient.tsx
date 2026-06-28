"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────────

interface KpiSnapshot {
  snapshotDate: string
  revenueMonth: string
  revenueYtd: string
  invoiceCount: number
  overdueAmount: string
  activeProjects: number
  totalTasks: number
  doneTasks: number
  headcount: number
  presentToday: number
  pendingLeave: number
  expensesMonth: string
  grossProfit: string
  activeLeads: number
  pipelineValue: string
  activeClients: number
  shopOrders: number
  shopRevenue: string
  healthScore: number
}

interface LiveKpis {
  revenueMonth: string
  revenueYtd: string
  overdueAmount: string
  activeProjects: number
  totalTasks: number
  doneTasks: number
  headcount: number
  presentToday: number
  pendingLeave: number
  expensesMonth: string
  grossProfit: string
  activeClients: number
  activeLeads: number
  shopOrders: number
  shopRevenue: string
  periodKey: string
}

interface AnalyticsData {
  snapshots: KpiSnapshot[]
  live: LiveKpis
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: string | number, decimals = 0) {
  return Number(v).toLocaleString("ro-RO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtEur(v: string | number) {
  return "€" + fmt(v, 2)
}

function pct(a: number, b: number) {
  if (!b) return "—"
  return Math.round((a / b) * 100) + "%"
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconBack() {
  return (
    <svg
      width="9"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function IconTrend() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      <div
        style={{
          height: 32,
          width: 200,
          background: "var(--prv-g2)",
          borderRadius: 8,
          marginBottom: 24,
        }}
        className="animate-pulse"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              height: 80,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border-subtle)",
              borderRadius: 20,
            }}
            className="animate-pulse"
          />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 60,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            borderRadius: 16,
            marginBottom: 8,
          }}
          className="animate-pulse"
        />
      ))}
    </div>
  )
}

// ── Health Score Ring ─────────────────────────────────────────────────────────

function HealthRing({ score }: { score: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color =
    score >= 70
      ? "rgba(255,255,255,0.85)"
      : score >= 40
        ? "rgba(255,255,255,0.55)"
        : "rgba(255,80,80,0.70)"

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
      <text
        x="36"
        y="40"
        textAnchor="middle"
        fill={color}
        fontSize="14"
        fontWeight="700"
        fontFamily="system-ui, -apple-system"
      >
        {score}
      </text>
    </svg>
  )
}

// ── KPI Domain Card ───────────────────────────────────────────────────────────

function DomainCard({
  label,
  primary,
  secondary,
  tertiary,
  icon,
}: {
  label: string
  primary: string
  secondary?: string
  tertiary?: string
  icon: React.ReactNode
}) {
  return (
    <div
      style={{
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        borderRadius: 20,
        padding: "14px 16px 12px",
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
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ color: "rgba(255,255,255,0.30)" }}>{icon}</span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "rgba(255,255,255,0.30)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {label}
        </span>
      </div>
      <p
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "rgba(255,255,255,0.95)",
          letterSpacing: "-0.4px",
          lineHeight: 1.1,
        }}
      >
        {primary}
      </p>
      {secondary && (
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{secondary}</p>
      )}
      {tertiary && (
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>{tertiary}</p>
      )}
    </div>
  )
}

// ── Mini Trend Bar Chart ──────────────────────────────────────────────────────

function TrendBars({
  snapshots,
  field,
  label,
}: {
  snapshots: KpiSnapshot[]
  field: keyof KpiSnapshot
  label: string
}) {
  const data = [...snapshots].reverse().slice(-14) // oldest→newest, last 14 days
  const values = data.map((s) => Number(s[field]) || 0)
  const max = Math.max(...values, 1)

  return (
    <div>
      <p
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: "rgba(255,255,255,0.30)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 6,
        }}
      >
        {label} · 14 zile
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 32 }}>
        {values.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(8, Math.round((v / max) * 32))}px`,
              background:
                i === values.length - 1 ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.12)",
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AnalyticsClient() {
  const [tab, setTab] = useState<"overview" | "trends">("overview")

  const { data, isLoading: loading } = useQuery({
    queryKey: ["analytics-kpis"],
    queryFn: () =>
      fetch("/api/analytics/kpis").then((r) => {
        if (!r.ok) throw new Error("Failed to load analytics")
        return r.json() as Promise<AnalyticsData>
      }),
  })

  if (loading) return <Skeleton />
  if (!data) return null

  const { live, snapshots } = data
  const today = snapshots[0]

  const taskComp = live.totalTasks > 0 ? Math.round((live.doneTasks / live.totalTasks) * 100) : 0
  const presentPct = live.headcount > 0 ? Math.round((live.presentToday / live.headcount) * 100) : 0
  const healthScore = today?.healthScore ?? 0

  return (
    <div className="px-4 pt-14 pb-28 max-w-2xl mx-auto">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            color: "rgba(255,255,255,0.35)",
            textDecoration: "none",
          }}
        >
          <IconBack />
        </Link>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "rgba(255,255,255,0.95)",
            flex: 1,
          }}
        >
          Analytics
        </h1>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)" }}>{live.periodKey}</span>
      </div>

      {/* Health Score Banner */}
      <div
        style={{
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 24,
          padding: "16px 20px",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 16,
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
        <HealthRing score={healthScore} />
        <div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
              marginBottom: 2,
            }}
          >
            Scor sănătate companie
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
            {healthScore >= 70
              ? "Performanță excelentă"
              : healthScore >= 40
                ? "Necesită atenție"
                : "Risc ridicat — acțiune imediată"}
          </p>
          {snapshots.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
              <span style={{ color: "rgba(255,255,255,0.25)" }}>
                <IconTrend />
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
                {snapshots.length} zile de date istorice
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div
        style={{
          display: "flex",
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          borderRadius: 12,
          padding: 3,
          marginBottom: 16,
        }}
      >
        {(["overview", "trends"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 9,
              border: "none",
              background: tab === t ? "rgba(255,255,255,0.10)" : "transparent",
              color: tab === t ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.35)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {t === "overview" ? "Prezentare generală" : "Tendințe"}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {/* Domain grid */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}
          >
            <DomainCard
              label="Venituri"
              primary={fmtEur(live.revenueMonth)}
              secondary={`YTD ${fmtEur(live.revenueYtd)}`}
              tertiary={
                Number(live.overdueAmount) > 0 ? `Restant ${fmtEur(live.overdueAmount)}` : undefined
              }
              icon={
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />
            <DomainCard
              label="Profit brut"
              primary={fmtEur(live.grossProfit)}
              secondary={`Cheltuieli ${fmtEur(live.expensesMonth)}`}
              icon={
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              }
            />
            <DomainCard
              label="Operațiuni"
              primary={`${live.activeProjects} proiecte`}
              secondary={`${live.doneTasks}/${live.totalTasks} task-uri (${taskComp}%)`}
              icon={
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              }
            />
            <DomainCard
              label="Forță de muncă"
              primary={`${live.headcount} angajați`}
              secondary={`${live.presentToday} prezenți azi (${presentPct}%)`}
              tertiary={live.pendingLeave > 0 ? `${live.pendingLeave} cereri concediu` : undefined}
              icon={
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <DomainCard
              label="CRM"
              primary={`${live.activeClients} clienți`}
              secondary={`${live.activeLeads} leads activi`}
              icon={
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              }
            />
            <DomainCard
              label="Shop"
              primary={fmtEur(live.shopRevenue)}
              secondary={`${fmt(live.shopOrders)} comenzi luna aceasta`}
              icon={
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              }
            />
          </div>

          {/* Quick metrics list */}
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.30)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 10,
            }}
          >
            Metrici rapide
          </p>
          {[
            { label: "Rată completare task-uri", value: pct(live.doneTasks, live.totalTasks) },
            { label: "Prezență azi", value: pct(live.presentToday, live.headcount) },
            {
              label: "Marja profit brut",
              value: pct(Number(live.grossProfit), Number(live.revenueMonth)),
            },
            { label: "Clienți activi", value: fmt(live.activeClients) },
            { label: "Comenzi shop / lună", value: fmt(live.shopOrders) },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 14px",
                background: "var(--prv-g1)",
                border: "1px solid var(--prv-border-subtle)",
                borderRadius: 12,
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{m.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.90)" }}>
                {m.value}
              </span>
            </div>
          ))}
        </>
      )}

      {tab === "trends" && (
        <>
          {snapshots.length < 2 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 0",
                color: "rgba(255,255,255,0.25)",
                fontSize: 13,
              }}
            >
              Date insuficiente.
              <br />
              Graficele apar după prima noapte de snapshot.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { field: "revenueMonth" as const, label: "Venituri lunare" },
                { field: "grossProfit" as const, label: "Profit brut" },
                { field: "activeProjects" as const, label: "Proiecte active" },
                { field: "headcount" as const, label: "Angajați activi" },
                { field: "shopOrders" as const, label: "Comenzi shop" },
                { field: "healthScore" as const, label: "Scor sănătate" },
              ].map(({ field, label }) => (
                <div
                  key={field}
                  style={{
                    background: "var(--prv-g1)",
                    border: "1px solid var(--prv-border-subtle)",
                    borderRadius: 16,
                    padding: "14px 16px",
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
                      background:
                        "linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.70)" }}
                    >
                      {label}
                    </span>
                    <span
                      style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.90)" }}
                    >
                      {field === "revenueMonth" || field === "grossProfit"
                        ? fmtEur(live[field])
                        : fmt(live[field as keyof LiveKpis] as number)}
                    </span>
                  </div>
                  <TrendBars snapshots={snapshots} field={field} label={label} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
