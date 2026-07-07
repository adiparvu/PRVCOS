"use client"

import { useRecruitmentFunnel, type RecruitmentFunnelResponse } from "@/lib/api-hooks"

type Stage = RecruitmentFunnelResponse["funnel"][number]
type Source = RecruitmentFunnelResponse["bySource"][number]

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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
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
          marginBottom: 14,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

export function RecruitmentFunnelClient() {
  const { data, isLoading } = useRecruitmentFunnel()
  const funnel: Stage[] = data?.funnel ?? []
  const top = funnel[0]?.count ?? 0
  const bySource: Source[] = data?.bySource ?? []

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>
        Recruitment Funnel
      </h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · people · hiring pipeline
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Tile label="Active" value={data?.active ?? 0} />
        <Tile label="Hired" value={data?.hired ?? 0} />
        <Tile label="Rejected" value={data?.rejected ?? 0} />
        <Tile
          label="Conversion"
          value={data?.overallConversionPct ?? "—"}
          suffix={data?.overallConversionPct != null ? "%" : undefined}
        />
      </div>

      {isLoading && <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>Loading…</div>}
      {!isLoading && (data?.total ?? 0) === 0 && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14 }}>
          No candidates in the pipeline.
        </div>
      )}

      {(data?.total ?? 0) > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
          <Card title="Funnel · reached each stage">
            {funnel.map((s, i) => {
              const width = top > 0 ? Math.max(s.count > 0 ? 6 : 0, (s.count / top) * 100) : 0
              return (
                <div key={s.stage} style={{ margin: "11px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                    <div style={{ width: 110, fontSize: 13, color: "var(--prv-text-2)" }}>
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--prv-text-3)",
                        width: 46,
                        textAlign: "right",
                      }}
                    >
                      {i === 0 ? "100%" : `${s.conversionFromPrevPct}%`}
                    </div>
                    <div
                      style={{
                        marginLeft: "auto",
                        fontSize: 13,
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {s.count}
                    </div>
                  </div>
                  <div
                    style={{
                      height: 26,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.4)",
                      width: `${width}%`,
                      minWidth: s.count > 0 ? 24 : 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: 8,
                      fontSize: 11,
                      color: "#000",
                      fontWeight: 700,
                    }}
                  >
                    {s.count > 0 ? s.count : ""}
                  </div>
                </div>
              )
            })}
          </Card>

          <Card title="By source">
            {bySource.map((src, i) => (
              <div
                key={src.source}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "9px 0",
                  borderBottom:
                    i < bySource.length - 1 ? "1px solid var(--prv-border-subtle)" : "none",
                  fontSize: 13.5,
                }}
              >
                <div>{src.source}</div>
                <div style={{ color: "var(--prv-text-3)", fontVariantNumeric: "tabular-nums" }}>
                  {src.count}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
