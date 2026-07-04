"use client"

import { useCompanyHealth, type CompanyHealthResponse } from "@/lib/api-hooks"

type Domain = CompanyHealthResponse["domains"][number]

const BAND_LABEL: Record<string, string> = {
  excellent: "Excellent",
  healthy: "Healthy",
  watch: "Needs watching",
  at_risk: "At risk",
}

const R = 60
const CIRC = 2 * Math.PI * R // ≈ 377

function Gauge({ score, band }: { score: number; band: string }) {
  const offset = CIRC * (1 - Math.max(0, Math.min(100, score)) / 100)
  const stroke =
    band === "at_risk" || band === "watch" ? "rgba(255,190,90,0.92)" : "rgba(255,255,255,0.85)"
  return (
    <div style={{ position: "relative", width: 140, height: 140, flex: "none" }}>
      <svg width={140} height={140} viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
        <circle cx={70} cy={70} r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={12} />
        <circle
          cx={70}
          cy={70}
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <b style={{ fontSize: 38, fontWeight: 720, letterSpacing: "-0.02em" }}>{score}</b>
        <span
          style={{
            fontSize: 11,
            color: "var(--prv-text-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginTop: 2,
          }}
        >
          {BAND_LABEL[band] ?? band}
        </span>
      </div>
    </div>
  )
}

function DomainRow({ d }: { d: Domain }) {
  const low = d.score < 60
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px 1fr auto",
        alignItems: "center",
        gap: 14,
        padding: "14px 4px",
        borderBottom: "1px solid var(--prv-border-subtle)",
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 560 }}>
        {d.label}
        <small
          style={{
            display: "block",
            color: "var(--prv-text-3)",
            fontSize: 11.5,
            fontWeight: 400,
            marginTop: 2,
          }}
        >
          {d.detail}
        </small>
      </div>
      <div
        style={{ height: 9, borderRadius: 100, background: "var(--prv-g2)", overflow: "hidden" }}
      >
        <i
          style={{
            display: "block",
            height: "100%",
            borderRadius: 100,
            width: `${d.score}%`,
            background: low
              ? "linear-gradient(90deg,rgba(255,176,64,.4),rgba(255,176,64,.16))"
              : "linear-gradient(90deg,rgba(255,255,255,.34),rgba(255,255,255,.16))",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 680,
          fontVariantNumeric: "tabular-nums",
          minWidth: 34,
          textAlign: "right",
          color: low ? "rgba(255,190,90,0.92)" : undefined,
        }}
      >
        {d.score}
      </div>
    </div>
  )
}

export function CompanyHealthClient() {
  const { data, isLoading, isError } = useCompanyHealth()

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 24px 80px" }}>
      <h1 style={{ fontSize: 29, fontWeight: 640, letterSpacing: "-0.02em" }}>Company health</h1>
      <div style={{ color: "var(--prv-text-3)", fontSize: 13.5, marginTop: 6 }}>
        Analytics · composite index across finance, projects, people &amp; sales
        {data?.date ? ` · ${data.date}` : ""}
      </div>

      {isLoading && (
        <div style={{ color: "var(--prv-text-3)", fontSize: 14, marginTop: 24 }}>Loading…</div>
      )}
      {isError && (
        <div style={{ color: "var(--prv-text-2)", fontSize: 14, marginTop: 24 }}>
          Could not load company health.
        </div>
      )}

      {data && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border)",
              borderRadius: 24,
              padding: 26,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 24px 64px rgba(0,0,0,0.5)",
              margin: "24px 0",
              flexWrap: "wrap",
            }}
          >
            <Gauge score={data.composite} band={data.band} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 18, fontWeight: 640 }}>
                {data.band === "excellent"
                  ? "Excellent shape"
                  : data.band === "healthy"
                    ? "Healthy company"
                    : data.band === "watch"
                      ? "Needs watching"
                      : "At risk"}
              </div>
              <div
                style={{ color: "var(--prv-text-2)", fontSize: 13, marginTop: 8, lineHeight: 1.5 }}
              >
                {(() => {
                  const sorted = [...data.domains].sort((a, b) => a.score - b.score)
                  const weakest = sorted[0]
                  const strongest = sorted[sorted.length - 1]
                  if (!weakest || !strongest) return "Composite across the four operating domains."
                  return `${strongest.label} leads at ${strongest.score}; ${weakest.label} is the main drag at ${weakest.score}.`
                })()}
              </div>
            </div>
          </div>

          <div>
            {data.domains.map((d) => (
              <DomainRow key={d.key} d={d} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
