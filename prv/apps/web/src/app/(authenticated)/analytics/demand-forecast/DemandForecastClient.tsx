"use client"

import { useDemandForecast, type DemandForecastResponse } from "@/lib/api-hooks"

type Row = DemandForecastResponse["products"][number]

function eur(n: number): string {
  if (Math.abs(n) >= 1000)
    return `€${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
  return `€${Math.round(n)}`
}

const BAND: Record<string, { label: string; cls: "crit" | "reorder" | "over" | "healthy" }> = {
  critical: { label: "Critical", cls: "crit" },
  reorder: { label: "Reorder", cls: "reorder" },
  overstock: { label: "Overstock", cls: "over" },
  healthy: { label: "Healthy", cls: "healthy" },
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

const numCell = {
  fontSize: 13,
  fontVariantNumeric: "tabular-nums" as const,
  textAlign: "right" as const,
}

const GRID = "1.5fr 0.7fr 0.8fr 0.9fr 0.9fr auto"

function ForecastRow({ p, last }: { p: Row; last: boolean }) {
  const b = BAND[p.band] ?? BAND.healthy!
  const badgeStyle =
    b.cls === "crit"
      ? {
          color: "rgba(255,105,97,0.95)",
          border: "1px solid rgba(255,105,97,0.36)",
          background: "rgba(255,105,97,0.12)",
        }
      : b.cls === "reorder"
        ? {
            color: "rgba(255,190,90,0.92)",
            border: "1px solid rgba(255,176,64,0.32)",
            background: "rgba(255,176,64,0.1)",
          }
        : b.cls === "over"
          ? {
              color: "var(--prv-text-2)",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "var(--prv-g3)",
            }
          : {
              color: "var(--prv-text-3)",
              border: "1px solid var(--prv-border)",
              background: "transparent",
            }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: GRID,
        gap: 10,
        alignItems: "center",
        padding: "12px 14px",
        borderBottom: last ? "0" : "1px solid var(--prv-border-subtle)",
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 560, minWidth: 0 }}>{p.name}</div>
      <div style={numCell}>{p.currentStock}</div>
      <div style={numCell}>{p.dailyVelocity}/d</div>
      <div style={numCell}>{p.daysOfCover === null ? "—" : p.daysOfCover}</div>
      <div style={numCell}>{p.suggestedReorderQty > 0 ? p.suggestedReorderQty : "—"}</div>
      <span
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          borderRadius: 6,
          padding: "3px 8px",
          whiteSpace: "nowrap",
          textAlign: "center",
          ...badgeStyle,
        }}
      >
        {b.label}
      </span>
    </div>
  )
}

export function DemandForecastClient() {
  const { data, isLoading } = useDemandForecast()
  const products = data?.products ?? []

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Demand Forecast</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · inventory demand &amp; reorder plan · {data?.horizonDays ?? 30}-day horizon ·{" "}
        {data?.windowDays ?? 90}-day velocity
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Stockout risk" value={data?.criticalCount ?? 0} tone="red" />
        <Tile label="To reorder" value={data?.reorderCount ?? 0} tone="amber" />
        <Tile label="Suggested units" value={data?.totalSuggestedUnits ?? 0} />
        <Tile label="Reorder value" value={eur(data?.totalSuggestedValue ?? 0)} />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && products.length === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No inventory data yet.</div>
      )}

      {products.length > 0 && (
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
              gridTemplateColumns: GRID,
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
            <div>Product</div>
            <div style={{ textAlign: "right" }}>Stock</div>
            <div style={{ textAlign: "right" }}>Velocity</div>
            <div style={{ textAlign: "right" }}>Days cover</div>
            <div style={{ textAlign: "right" }}>Order qty</div>
            <div>Plan</div>
          </div>
          {products.map((p, i) => (
            <ForecastRow key={p.productId} p={p} last={i === products.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
