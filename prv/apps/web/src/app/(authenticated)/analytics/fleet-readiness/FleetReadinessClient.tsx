"use client"

import { useFleetReadiness, type FleetReadinessResponse } from "@/lib/api-hooks"

type Row = FleetReadinessResponse["attentionList"][number]

// A reason is "red" if it grounds the vehicle or is an overdue/expired condition.
function reasonTone(reason: string): "red" | "amber" {
  return /overdue|expired|maintenance/i.test(reason) ? "red" : "amber"
}

function Tile({
  label,
  value,
  suffix,
  tone,
}: {
  label: string
  value: React.ReactNode
  suffix?: string
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
        {suffix && (
          <span style={{ fontSize: 13, color: "var(--prv-text-3)", fontWeight: 560 }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function VehicleRow({ v, last }: { v: Row; last: boolean }) {
  const grounded = v.state === "grounded"
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 18px",
        borderBottom: last ? "none" : "1px solid var(--prv-border-subtle)",
      }}
    >
      <span
        style={{
          width: 3,
          alignSelf: "stretch",
          borderRadius: 99,
          flexShrink: 0,
          background: grounded ? "rgba(255,105,97,0.95)" : "rgba(255,190,90,0.92)",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{v.label}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          {v.reasons.map((reason, i) => {
            const tone = reasonTone(reason)
            return (
              <span
                key={i}
                style={{
                  fontSize: 10.5,
                  borderRadius: 6,
                  padding: "2px 8px",
                  color: tone === "red" ? "rgba(255,105,97,0.95)" : "rgba(255,190,90,0.92)",
                  border:
                    tone === "red"
                      ? "1px solid rgba(255,105,97,0.32)"
                      : "1px solid rgba(255,176,64,0.3)",
                  background: tone === "red" ? "rgba(255,105,97,0.1)" : "rgba(255,176,64,0.1)",
                }}
              >
                {reason}
              </span>
            )
          })}
        </div>
      </div>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: grounded ? "rgba(255,105,97,0.95)" : "var(--prv-text-3)",
          flexShrink: 0,
          textAlign: "right",
        }}
      >
        {grounded ? "Grounded" : "Attention"}
      </div>
    </div>
  )
}

export function FleetReadinessClient() {
  const { data, isLoading } = useFleetReadiness()
  const list = data?.attentionList ?? []

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Fleet Readiness</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · fleet management · operating fleet
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
          label="Readiness"
          value={data?.readinessRatePct ?? "—"}
          suffix={data?.readinessRatePct != null ? "%" : undefined}
        />
        <Tile label="Grounded" value={data?.grounded ?? 0} tone="red" />
        <Tile label="Service due" value={data?.serviceDue ?? 0} tone="amber" />
        <Tile label="Compliance" value={data?.complianceIssues ?? 0} tone="amber" />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && (data?.total ?? 0) === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No vehicles in the fleet.</div>
      )}
      {!isLoading && (data?.total ?? 0) > 0 && list.length === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
          Whole fleet ready — nothing needs attention.
        </div>
      )}

      {list.length > 0 && (
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border)",
            borderRadius: 22,
            overflow: "hidden",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          {list.map((v, i) => (
            <VehicleRow key={v.id} v={v} last={i === list.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
