"use client"

import { useMaintenanceAnalytics } from "@/lib/api-hooks"

function money(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")}`
}

function Tile({
  label,
  value,
  unit,
  sub,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  sub?: string
}) {
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
      <div style={{ fontSize: 24, fontWeight: 680, marginTop: 8, letterSpacing: "-0.02em" }}>
        {value}
        {unit && (
          <span style={{ fontSize: 13, color: "var(--prv-text-3)", fontWeight: 560 }}> {unit}</span>
        )}
        {sub && (
          <span style={{ fontSize: 13, color: "var(--prv-text-3)", fontWeight: 560 }}>{sub}</span>
        )}
      </div>
    </div>
  )
}

const GRID = "1.6fr 0.9fr 0.6fr"

export function MaintenanceAnalyticsClient() {
  const { data, isLoading } = useMaintenanceAnalytics()
  const byType = data?.costByType ?? []
  const maxCost = Math.max(1, ...byType.map((t) => t.cost))
  const vehCost = data?.costByAssetType.vehicle ?? 0
  const toolCost = data?.costByAssetType.tool ?? 0

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>
        Maintenance & Trips
      </h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · fleet &amp; tools cost · last 90 days
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Maintenance cost" value={money(data?.totalCost ?? 0)} unit="RON" />
        <Tile
          label="Open records"
          value={data?.openRecords ?? 0}
          sub={`/${data?.totalRecords ?? 0}`}
        />
        <Tile label="Trip distance" value={money(data?.trips.totalDistanceKm ?? 0)} unit="km" />
        <Tile label="Fuel cost" value={money(data?.trips.totalFuelCost ?? 0)} unit="RON" />
      </div>

      {/* Vehicle vs tool split */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        <Tile label="Vehicles" value={money(vehCost)} unit="RON" />
        <Tile label="Tools" value={money(toolCost)} unit="RON" />
      </div>

      <div
        style={{
          color: "var(--prv-text-3)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          fontWeight: 560,
          margin: "0 2px 10px",
        }}
      >
        Cost by work type
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && byType.length === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
          No maintenance records in the window.
        </div>
      )}

      {byType.length > 0 && (
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border)",
            borderRadius: 22,
            padding: "8px 8px 4px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: GRID,
              gap: 10,
              padding: "12px 16px",
              color: "var(--prv-text-3)",
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 560,
              borderBottom: "1px solid var(--prv-border-subtle)",
            }}
          >
            <div>Type</div>
            <div style={{ textAlign: "right" }}>Cost</div>
            <div style={{ textAlign: "right" }}>Count</div>
          </div>
          {byType.map((t, i) => (
            <div
              key={t.type}
              style={{
                display: "grid",
                gridTemplateColumns: GRID,
                gap: 10,
                alignItems: "center",
                padding: "13px 16px",
                borderBottom: i < byType.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 560 }}>{t.type}</div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 99,
                    background: "var(--prv-g3)",
                    overflow: "hidden",
                    marginTop: 6,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 99,
                      background: "rgba(255,255,255,0.55)",
                      width: `${Math.max(t.cost > 0 ? 4 : 0, (t.cost / maxCost) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                {money(t.cost)} RON
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                  color: "var(--prv-text-2)",
                }}
              >
                {t.count}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
