"use client"

import { useSafetyMetrics } from "@/lib/api-hooks"

function Tile({
  label,
  value,
  suffix,
}: {
  label: string
  value: React.ReactNode
  suffix?: string
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
      <div style={{ fontSize: 23, fontWeight: 680, marginTop: 8, letterSpacing: "-0.02em" }}>
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

export function SafetyMetricsClient() {
  const { data, isLoading } = useSafetyMetrics()
  const byLocation = data?.byLocation ?? []
  const maxLoc = Math.max(1, ...byLocation.map((l) => l.count))

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Safety Metrics</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · safety domain · officer KPIs
      </div>

      <div
        style={{
          margin: "22px 0 16px",
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border)",
          borderRadius: 22,
          padding: "26px 24px",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 64px rgba(0,0,0,0.5)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 58, fontWeight: 720, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {data?.daysSinceLastIncident ?? "—"}
        </div>
        <div
          style={{
            color: "var(--prv-text-3)",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 560,
            marginTop: 10,
          }}
        >
          Days since last recordable incident
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <Tile label="Last 30 days" value={data?.incidentsLast30 ?? 0} />
        <Tile label="Recordable" value={data?.recordable ?? 0} />
        <Tile label="Near misses" value={data?.nearMiss ?? 0} />
        <Tile
          label="Near-miss ratio"
          value={
            data?.nearMissRatioPct === null || data?.nearMissRatioPct === undefined
              ? "—"
              : data.nearMissRatioPct
          }
          suffix={data?.nearMissRatioPct != null ? "%" : undefined}
        />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}

      {byLocation.length > 0 && (
        <div
          style={{
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border)",
            borderRadius: 22,
            padding: "18px 20px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          <h2
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--prv-text-3)",
              fontWeight: 560,
              marginBottom: 6,
            }}
          >
            High-risk locations · recordable incident density
          </h2>
          {byLocation.map((l, i) => (
            <div
              key={l.location}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 0",
                borderBottom:
                  i < byLocation.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                fontSize: 13.5,
              }}
            >
              <div
                style={{
                  color: "var(--prv-text-3)",
                  width: 20,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>{l.location}</div>
              <div
                style={{
                  width: 120,
                  height: 7,
                  borderRadius: 99,
                  background: "var(--prv-g3)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 99,
                    background: "rgba(255,105,97,0.95)",
                    width: `${Math.max(8, (l.count / maxLoc) * 100)}%`,
                  }}
                />
              </div>
              <div
                style={{
                  width: 26,
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 600,
                }}
              >
                {l.count}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (data?.total ?? 0) === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>No incidents recorded.</div>
      )}
    </div>
  )
}
