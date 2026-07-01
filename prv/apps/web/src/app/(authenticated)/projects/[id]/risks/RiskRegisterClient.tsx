"use client"

import { useState } from "react"
import Link from "next/link"
import { useProjectRisks, useCreateRisk, type RiskSummary } from "@/lib/api-hooks"
import { scoreRisk, type RiskBand } from "@/lib/risk"

const BAND_STYLE: Record<RiskBand, { color: string; bg: string; border: string }> = {
  critical: {
    color: "rgba(255,69,58,0.9)",
    bg: "rgba(255,69,58,0.16)",
    border: "rgba(255,69,58,0.3)",
  },
  high: {
    color: "rgba(255,159,10,0.95)",
    bg: "rgba(255,159,10,0.14)",
    border: "rgba(255,159,10,0.28)",
  },
  medium: { color: "var(--prv-text-1)", bg: "var(--prv-g2)", border: "var(--prv-border-subtle)" },
  low: { color: "var(--prv-text-3)", bg: "var(--prv-g1)", border: "var(--prv-border-subtle)" },
}

// Cell tint follows the band but stays monochrome until it turns dangerous.
function cellBg(score: number): string {
  if (score >= 15) return `rgba(255,69,58,${0.12 + Math.min(score, 25) / 160})`
  if (score >= 8) return `rgba(255,159,10,${0.1 + score / 220})`
  return `rgba(255,255,255,${0.04 + score / 120})`
}

const CATEGORIES = [
  "schedule",
  "cost",
  "quality",
  "safety",
  "resource",
  "external",
  "other",
] as const

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: "14px 16px",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          marginTop: 6,
          color: warn ? "rgba(255,69,58,0.9)" : "var(--prv-text-1)",
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: "1px solid var(--prv-border)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        style={stepBtn}
        aria-label="decrease"
      >
        −
      </button>
      <span
        style={{
          width: 30,
          textAlign: "center",
          fontSize: 14,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(5, value + 1))}
        style={stepBtn}
        aria-label="increase"
      >
        +
      </button>
    </div>
  )
}
const stepBtn: React.CSSProperties = {
  width: 30,
  height: 34,
  background: "var(--prv-g1)",
  border: "none",
  color: "var(--prv-text-1)",
  fontSize: 16,
  cursor: "pointer",
}

export function RiskRegisterClient({ id }: { id: string }) {
  const { data, isLoading } = useProjectRisks(id)
  const create = useCreateRisk(id)

  const risks = data?.risks ?? []
  const meta = data?.meta

  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("schedule")
  const [impact, setImpact] = useState(3)
  const [probability, setProbability] = useState(3)
  const draftScore = scoreRisk(impact, probability)

  // Group risks by (impact, probability) cell for the matrix.
  const cellCount = new Map<string, number>()
  for (const r of risks)
    cellCount.set(
      `${r.impact}-${r.probability}`,
      (cellCount.get(`${r.impact}-${r.probability}`) ?? 0) + 1
    )

  function submit() {
    if (!title.trim()) return
    create.mutate(
      { title: title.trim(), category, impact, probability },
      {
        onSuccess: () => {
          setTitle("")
          setImpact(3)
          setProbability(3)
          setCategory("schedule")
          setShowAdd(false)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 4px 60px" }}>
      <Link
        href={`/projects/${id}`}
        style={{
          fontSize: 12.5,
          color: "var(--prv-text-3)",
          textDecoration: "none",
          display: "inline-flex",
          gap: 5,
          marginBottom: 12,
        }}
      >
        ‹ Back to project
      </Link>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--prv-text-3)",
            }}
          >
            Project · Risks
          </div>
          <h1
            style={{ fontSize: 28, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 0" }}
          >
            Risk Register
          </h1>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          style={{
            padding: "9px 16px",
            borderRadius: 100,
            background: showAdd ? "var(--prv-g2)" : "rgba(255,255,255,0.92)",
            color: showAdd ? "var(--prv-text-1)" : "#000",
            border: showAdd ? "1px solid var(--prv-border)" : "none",
            fontSize: 13,
            fontWeight: 640,
            cursor: "pointer",
          }}
        >
          {showAdd ? "Cancel" : "＋ Log risk"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          margin: "20px 0 22px",
        }}
      >
        <Stat label="Total" value={meta?.total ?? 0} />
        <Stat label="Open" value={meta?.open ?? 0} />
        <Stat label="Critical" value={meta?.byBand.critical ?? 0} warn={!!meta?.byBand.critical} />
        <Stat label="Top score" value={meta?.topScore ?? 0} />
      </div>

      {showAdd && (
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            marginBottom: 22,
            background: "var(--prv-g1)",
            border: "1px solid var(--prv-border-subtle)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
          }}
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Describe the risk…"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              background: "var(--prv-g1)",
              border: "1px solid var(--prv-border)",
              color: "var(--prv-text-1)",
              fontSize: 14,
              outline: "none",
              fontFamily: "inherit",
              marginBottom: 12,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <label style={lbl}>
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
                style={{
                  marginLeft: 8,
                  padding: "6px 10px",
                  borderRadius: 10,
                  background: "var(--prv-g1)",
                  border: "1px solid var(--prv-border)",
                  color: "var(--prv-text-1)",
                  fontSize: 13,
                  textTransform: "capitalize",
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label style={lbl}>
              Impact{" "}
              <span style={{ marginLeft: 8 }}>
                <Stepper value={impact} onChange={setImpact} />
              </span>
            </label>
            <label style={lbl}>
              Probability{" "}
              <span style={{ marginLeft: 8 }}>
                <Stepper value={probability} onChange={setProbability} />
              </span>
            </label>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 100,
                color: BAND_STYLE[draftScore.band].color,
                background: BAND_STYLE[draftScore.band].bg,
                border: `1px solid ${BAND_STYLE[draftScore.band].border}`,
                textTransform: "capitalize",
              }}
            >
              {draftScore.score} · {draftScore.band}
            </span>
            <button
              onClick={submit}
              disabled={!title.trim() || create.isPending}
              style={{
                padding: "9px 18px",
                borderRadius: 100,
                background: "rgba(255,255,255,0.92)",
                color: "#000",
                border: "none",
                fontSize: 13,
                fontWeight: 640,
                cursor: title.trim() ? "pointer" : "default",
                opacity: title.trim() && !create.isPending ? 1 : 0.5,
              }}
            >
              Log risk
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
          margin: "0 4px 12px",
        }}
      >
        Probability × Impact
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5, marginBottom: 24 }}
      >
        {[5, 4, 3, 2, 1].map((p) =>
          [1, 2, 3, 4, 5].map((i) => {
            const score = i * p
            const count = cellCount.get(`${i}-${p}`) ?? 0
            return (
              <div
                key={`${i}-${p}`}
                style={{
                  aspectRatio: "1.6 / 1",
                  borderRadius: 8,
                  background: cellBg(score),
                  border: "1px solid var(--prv-border-subtle)",
                  display: "grid",
                  placeItems: "center",
                  position: "relative",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--prv-text-3)",
                }}
              >
                {score}
                {count > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 5,
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      borderRadius: 100,
                      background: "var(--prv-text-1)",
                      color: "#000",
                      fontSize: 10,
                      fontWeight: 800,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {count}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
          margin: "0 4px 12px",
        }}
      >
        Register · by severity
      </div>
      <div
        style={{
          borderRadius: 22,
          overflow: "hidden",
          background: "var(--prv-g1)",
          border: "1px solid var(--prv-border-subtle)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
        }}
      >
        {isLoading ? (
          <p style={{ padding: "40px 20px", textAlign: "center", color: "var(--prv-text-4)" }}>
            Loading risks…
          </p>
        ) : risks.length === 0 ? (
          <p
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--prv-text-4)",
              fontSize: 14,
            }}
          >
            No risks logged yet. Use “Log risk” to add the first one.
          </p>
        ) : (
          risks.map((r) => <RiskRow key={r.id} risk={r} />)
        )}
      </div>
    </div>
  )
}
const lbl: React.CSSProperties = {
  fontSize: 12,
  color: "var(--prv-text-2)",
  display: "flex",
  alignItems: "center",
  fontWeight: 600,
}

function RiskRow({ risk }: { risk: RiskSummary }) {
  const style = BAND_STYLE[risk.band]
  return (
    <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--prv-border-subtle)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            width: 34,
            height: 26,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
            color: style.color,
            background: style.bg,
            border: `1px solid ${style.border}`,
          }}
        >
          {risk.score}
        </span>
        <span style={{ fontSize: 14, fontWeight: 640, letterSpacing: "-0.01em", flex: 1 }}>
          {risk.title}
        </span>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--prv-text-3)",
            border: "1px solid var(--prv-border)",
            borderRadius: 100,
            padding: "3px 9px",
          }}
        >
          {risk.status}
        </span>
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--prv-text-3)",
          marginTop: 6,
          marginLeft: 44,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          textTransform: "capitalize",
        }}
      >
        <span>{risk.category}</span>
        <span>Owner: {risk.ownerName ?? "—"}</span>
        <span style={{ textTransform: "none" }}>
          I{risk.impact} × P{risk.probability}
        </span>
      </div>
    </div>
  )
}
