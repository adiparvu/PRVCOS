"use client"

import { useProjectHealth, type ProjectHealthBand } from "@/lib/api-hooks"

const BAND: Record<ProjectHealthBand, { color: string; label: string }> = {
  healthy: { color: "rgba(48,209,88,0.9)", label: "Healthy" },
  at_risk: { color: "rgba(255,159,10,0.95)", label: "At risk" },
  critical: { color: "rgba(255,69,58,0.9)", label: "Critical" },
}

const R = 52
const CIRC = 2 * Math.PI * R

function Bar({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <div
        style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}
      >
        <span style={{ color: "var(--prv-text-2)", fontWeight: 600 }}>{label}</span>
        <span style={{ color: "var(--prv-text-3)", fontVariantNumeric: "tabular-nums" }}>
          {value}
        </span>
      </div>
      <div
        style={{
          height: 7,
          borderRadius: 100,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            borderRadius: 100,
            background: tone ?? "rgba(255,255,255,0.8)",
            transition: "width 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      </div>
    </div>
  )
}

// Self-fetching project health gauge (roadmap 6.1). Drop into the project
// detail; reads /api/projects/[id]/health and renders the composite score +
// budget/progress/risk breakdown.
export function ProjectHealthCard({ projectId }: { projectId: string }) {
  const { data, isLoading } = useProjectHealth(projectId)
  if (isLoading || !data) {
    return (
      <div
        style={{
          margin: "0 20px",
          borderRadius: 24,
          padding: 22,
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          color: "var(--prv-text-4)",
          fontSize: 13,
        }}
      >
        {isLoading ? "Computing health…" : "Health unavailable"}
      </div>
    )
  }

  const band = BAND[data.band]
  const offset = CIRC * (1 - Math.max(0, Math.min(100, data.score)) / 100)
  const budgetTone =
    data.inputs.budgetBand === "red"
      ? "rgba(255,69,58,0.9)"
      : data.inputs.budgetBand === "amber"
        ? "rgba(255,159,10,0.95)"
        : undefined
  const riskTone = data.breakdown.risk < 60 ? "rgba(255,69,58,0.9)" : undefined

  return (
    <div
      style={{
        margin: "0 20px",
        borderRadius: 24,
        padding: 22,
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
        display: "flex",
        alignItems: "center",
        gap: 22,
      }}
    >
      <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={band.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.34,1.56,0.64,1)" }}
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
          <span style={{ fontSize: 34, fontWeight: 720, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {data.score}
          </span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: band.color,
              marginTop: 4,
            }}
          >
            {band.label}
          </span>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        <Bar label="Budget" value={data.breakdown.budget} tone={budgetTone} />
        <Bar label="Progress" value={data.breakdown.progress} />
        <Bar label="Risk" value={data.breakdown.risk} tone={riskTone} />
      </div>
    </div>
  )
}
