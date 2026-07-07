"use client"

import { useFleetUtilization, type FleetUtilizationResponse } from "@/lib/api-hooks"

type Row = FleetUtilizationResponse["vehicles"][number]

function km(n: number): string {
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

const GRID = "1.6fr 1fr 0.7fr"

export function FleetUtilizationClient() {
  const { data, isLoading } = useFleetUtilization()
  const vehicles = data?.vehicles ?? []
  const maxKm = Math.max(1, ...vehicles.map((v) => v.kmDriven))

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Fleet Utilization</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · fleet management · last {data?.windowDays ?? 30} days
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Total distance" value={km(data?.totalKm ?? 0)} unit="km" />
        <Tile
          label="Active vehicles"
          value={data?.activeVehicles ?? 0}
          sub={`/${data?.vehiclesLogged ?? 0}`}
        />
        <Tile
          label="Avg / vehicle"
          value={data?.avgKmPerActive != null ? km(data.avgKmPerActive) : "—"}
          unit={data?.avgKmPerActive != null ? "km" : undefined}
        />
        <Tile label="Avg / day" value={km(data?.avgKmPerDay ?? 0)} unit="km" />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && vehicles.length === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
          No odometer logs in the window.
        </div>
      )}

      {vehicles.length > 0 && (
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
            <div>Vehicle</div>
            <div style={{ textAlign: "right" }}>Distance</div>
            <div style={{ textAlign: "right" }}>Days</div>
          </div>
          {vehicles.map((v: Row, i) => (
            <div
              key={v.vehicleId}
              style={{
                display: "grid",
                gridTemplateColumns: GRID,
                gap: 10,
                alignItems: "center",
                padding: "13px 16px",
                borderBottom:
                  i < vehicles.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 560 }}>{v.label}</div>
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
                      width: `${Math.max(v.kmDriven > 0 ? 4 : 0, (v.kmDriven / maxKm) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                {km(v.kmDriven)} km
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                  color: "var(--prv-text-2)",
                }}
              >
                {v.logDays}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
