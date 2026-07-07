"use client"

import { useSafetyTraining, type SafetyTrainingResponse } from "@/lib/api-hooks"

type Row = SafetyTrainingResponse["records"][number]

const STATUS_LABEL: Record<string, string> = {
  expired: "Expired",
  critical: "Critical",
  warning: "Warning",
  notice: "Notice",
  valid: "Valid",
}

function railColor(status: string): string {
  if (status === "expired" || status === "critical") return "rgba(255,105,97,0.95)"
  if (status === "warning" || status === "notice") return "rgba(255,190,90,0.92)"
  return "var(--prv-text-3)"
}

function daysLabel(row: Row): string {
  if (row.daysUntilExpiry === null) return "No expiry"
  const d = row.daysUntilExpiry
  if (d < 0) return `${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} ago`
  return `${d} day${d === 1 ? "" : "s"}`
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

export function SafetyTrainingClient() {
  const { data, isLoading } = useSafetyTraining()
  const records = data?.records ?? []

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>
        Training Compliance
      </h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · safety domain · certification &amp; training expiry
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
          label="Compliance"
          value={data?.complianceRatePct ?? "—"}
          suffix={data?.complianceRatePct != null ? "%" : undefined}
        />
        <Tile label="Expired" value={data?.expired ?? 0} tone="red" />
        <Tile label="Expiring ≤60d" value={data?.expiringSoon ?? 0} tone="amber" />
        <Tile label="Certificates" value={data?.total ?? 0} />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && records.length === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No training records.</div>
      )}

      {records.length > 0 && (
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border)",
            borderRadius: 22,
            overflow: "hidden",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          {records.map((r, i) => {
            const isRed = r.status === "expired" || r.status === "critical"
            const isAmber = r.status === "warning" || r.status === "notice"
            return (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 18px",
                  borderBottom:
                    i < records.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                }}
              >
                <span
                  style={{
                    width: 3,
                    alignSelf: "stretch",
                    borderRadius: 99,
                    background: railColor(r.status),
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {r.userName} · {r.trainingName}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--prv-text-3)", marginTop: 2 }}>
                    {r.provider ?? "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: isRed
                        ? "rgba(255,105,97,0.95)"
                        : isAmber
                          ? "rgba(255,190,90,0.92)"
                          : "var(--prv-text-2)",
                    }}
                  >
                    {daysLabel(r)}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "var(--prv-text-3)",
                      marginTop: 2,
                    }}
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
