"use client"

import { useInventoryEfficiency, type InventoryEfficiencyResponse } from "@/lib/api-hooks"

type Row = InventoryEfficiencyResponse["products"][number]

function eur(n: number): string {
  if (Math.abs(n) >= 1000)
    return `€${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
  return `€${Math.round(n)}`
}

const BAND: Record<string, { label: string; cls: "fast" | "slow" | "dead" | "healthy" }> = {
  fast: { label: "Fast", cls: "fast" },
  healthy: { label: "Healthy", cls: "healthy" },
  slow: { label: "Slow", cls: "slow" },
  dead: { label: "Dead", cls: "dead" },
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
  const positive = typeof value === "number" ? value > 0 : value !== "€0" && value !== "0"
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

const GRID = "1.5fr 0.8fr 0.8fr 0.8fr 0.8fr auto"

function ProdRow({ p, last }: { p: Row; last: boolean }) {
  const b = BAND[p.band] ?? BAND.healthy!
  const badgeStyle =
    b.cls === "fast"
      ? {
          color: "var(--prv-text-1)",
          border: "1px solid rgba(255,255,255,0.28)",
          background: "var(--prv-g3)",
        }
      : b.cls === "slow"
        ? {
            color: "rgba(255,190,90,0.92)",
            border: "1px solid rgba(255,176,64,0.32)",
            background: "rgba(255,176,64,0.1)",
          }
        : b.cls === "dead"
          ? {
              color: "rgba(255,105,97,0.95)",
              border: "1px solid rgba(255,105,97,0.36)",
              background: "rgba(255,105,97,0.12)",
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
      <div style={numCell}>{eur(p.inventoryValue)}</div>
      <div style={numCell}>{p.unitsSold}</div>
      <div style={numCell}>{p.turnover === null ? "—" : `${p.turnover}×`}</div>
      <div style={numCell}>{p.daysOnHand === null ? "—" : p.daysOnHand}</div>
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

export function InventoryEfficiencyClient() {
  const { data, isLoading } = useInventoryEfficiency()
  const products = data?.products ?? []

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>
        Inventory Efficiency
      </h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · cross-module BI · procurement cost vs turnover · last {data?.periodDays ?? 90}{" "}
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
        <Tile label="Inventory value" value={eur(data?.totalInventoryValue ?? 0)} />
        <Tile
          label="Turnover"
          value={
            data?.overallTurnover === null || data?.overallTurnover === undefined
              ? "—"
              : `${data.overallTurnover}×`
          }
        />
        <Tile label="Dead stock" value={eur(data?.deadStockValue ?? 0)} tone="red" />
        <Tile label="Slow movers" value={data?.slowCount ?? 0} tone="amber" />
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
            <div style={{ textAlign: "right" }}>Stock €</div>
            <div style={{ textAlign: "right" }}>Sold</div>
            <div style={{ textAlign: "right" }}>Turns/yr</div>
            <div style={{ textAlign: "right" }}>Days on hand</div>
            <div>Movement</div>
          </div>
          {products.map((p, i) => (
            <ProdRow key={p.productId} p={p} last={i === products.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
