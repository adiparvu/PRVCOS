"use client"

import { useProjectProfitability, type ProjectProfitabilityResponse } from "@/lib/api-hooks"

type Row = ProjectProfitabilityResponse["projects"][number]

function eur(n: number): string {
  const abs = Math.abs(n)
  const s =
    abs >= 1000
      ? `€${(abs / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
      : `€${Math.round(abs)}`
  return n < 0 ? `−${s}` : s
}

function Tile({ label, value, tone }: { label: string; value: string | number; tone?: "red" }) {
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
          color: tone === "red" && Number(value) > 0 ? "rgba(255,120,110,0.92)" : undefined,
        }}
      >
        {value}
      </div>
    </div>
  )
}

const numCell = {
  fontSize: 13,
  fontVariantNumeric: "tabular-nums" as const,
  textAlign: "right" as const,
}

function ProjectRow({ p, last }: { p: Row; last: boolean }) {
  const loss = p.band === "loss"
  const thin = p.band === "thin"
  const badge = loss ? "Loss" : thin ? `${p.marginPct}% margin` : `${p.marginPct}% margin`
  const badgeColor = loss
    ? "rgba(255,120,110,0.92)"
    : thin
      ? "rgba(255,190,90,0.92)"
      : "var(--prv-text-3)"
  const badgeBorder = loss
    ? "rgba(255,90,80,0.3)"
    : thin
      ? "rgba(255,176,64,0.32)"
      : "var(--prv-border)"
  const badgeBg = loss ? "rgba(255,90,80,0.12)" : thin ? "rgba(255,176,64,0.1)" : "transparent"
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.6fr 1fr 1fr 1fr auto",
        gap: 10,
        alignItems: "center",
        padding: "12px 14px",
        borderBottom: last ? "0" : "1px solid var(--prv-border-subtle)",
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 560, minWidth: 0 }}>
        {p.name}
        <small style={{ display: "block", color: "var(--prv-text-3)", fontSize: 11, marginTop: 2 }}>
          budget {p.budgetUsedPct}% used
        </small>
      </div>
      <div style={numCell}>{eur(p.revenue)}</div>
      <div style={numCell}>{eur(p.cost)}</div>
      <div
        style={{
          ...numCell,
          fontWeight: 620,
          color: p.profit < 0 ? "rgba(255,120,110,0.92)" : "var(--prv-text-1)",
        }}
      >
        {p.profit >= 0 ? "+" : ""}
        {eur(p.profit)}
      </div>
      <span
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          borderRadius: 6,
          padding: "3px 8px",
          whiteSpace: "nowrap",
          textAlign: "center",
          border: `1px solid ${badgeBorder}`,
          color: badgeColor,
          background: badgeBg,
        }}
      >
        {badge}
      </span>
    </div>
  )
}

export function ProfitabilityClient() {
  const { data, isLoading } = useProjectProfitability()
  const projects = data?.projects ?? []

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>
        Project profitability
      </h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · cross-module BI · paid-invoice revenue vs spent budget
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Portfolio revenue" value={eur(data?.totalRevenue ?? 0)} />
        <Tile label="Portfolio profit" value={eur(data?.totalProfit ?? 0)} />
        <Tile label="Margin" value={`${data?.marginPct ?? 0}%`} />
        <Tile label="Loss-making" value={data?.lossCount ?? 0} tone="red" />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && projects.length === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
          No projects with financials yet.
        </div>
      )}

      {projects.length > 0 && (
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border)",
            borderRadius: 22,
            padding: "8px 8px 4px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 64px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr 1fr 1fr auto",
              gap: 10,
              padding: "12px 14px",
              color: "var(--prv-text-3)",
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 560,
              borderBottom: "1px solid var(--prv-border-subtle)",
            }}
          >
            <div>Project</div>
            <div style={{ textAlign: "right" }}>Revenue</div>
            <div style={{ textAlign: "right" }}>Cost</div>
            <div style={{ textAlign: "right" }}>Profit</div>
            <div>Status</div>
          </div>
          {projects.map((p, i) => (
            <ProjectRow key={p.id} p={p} last={i === projects.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
