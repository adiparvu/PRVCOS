"use client"

import Link from "next/link"
import { useProjectBudget, type BudgetLine } from "@/lib/api-hooks"

const CATEGORY_ORDER = ["labor", "materials", "equipment", "overhead", "contingency"] as const

const HEALTH: Record<string, { color: string; bg: string; border: string; label: string }> = {
  green: {
    color: "rgba(48,209,88,0.9)",
    bg: "rgba(48,209,88,0.12)",
    border: "rgba(48,209,88,0.28)",
    label: "On budget",
  },
  amber: {
    color: "rgba(255,159,10,0.95)",
    bg: "rgba(255,159,10,0.14)",
    border: "rgba(255,159,10,0.28)",
    label: "Watch budget",
  },
  red: {
    color: "rgba(255,69,58,0.9)",
    bg: "rgba(255,69,58,0.14)",
    border: "rgba(255,69,58,0.3)",
    label: "Over budget",
  },
}

function eur(n: number): string {
  return `€${Math.round(n).toLocaleString("en-US")}`
}

function Metric({
  k,
  v,
  hint,
  tone,
}: {
  k: string
  v: string
  hint: string
  tone?: "good" | "bad" | "warn"
}) {
  const color =
    tone === "good"
      ? "rgba(48,209,88,0.9)"
      : tone === "bad"
        ? "rgba(255,69,58,0.9)"
        : tone === "warn"
          ? "rgba(255,159,10,0.95)"
          : "var(--prv-text-1)"
  return (
    <div
      style={{
        borderRadius: 16,
        padding: "13px 14px",
        background: "var(--prv-g1)",
        border: "1px solid var(--prv-border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
        }}
      >
        {k}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          marginTop: 5,
          fontVariantNumeric: "tabular-nums",
          color,
        }}
      >
        {v}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--prv-text-4)", marginTop: 2 }}>{hint}</div>
    </div>
  )
}

function CategoryRow({ line }: { line: BudgetLine }) {
  const over = line.actualAmount > line.plannedAmount && line.plannedAmount > 0
  const pct =
    line.plannedAmount > 0 ? Math.min(100, (line.actualAmount / line.plannedAmount) * 100) : 0
  return (
    <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--prv-border-subtle)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
          gap: 8,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, textTransform: "capitalize" }}>
          {line.category}
        </span>
        <span style={amt()}>{eur(line.plannedAmount)}</span>
        <span style={amt()}>{eur(line.committedAmount)}</span>
        <span style={amt(true, over)}>{eur(line.actualAmount)}</span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 100,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
          marginTop: 8,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${over ? 100 : pct}%`,
            borderRadius: 100,
            background: over ? "rgba(255,69,58,0.9)" : "rgba(255,255,255,0.7)",
            transition: "width 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      </div>
    </div>
  )
}

function amt(actual = false, over = false): React.CSSProperties {
  return {
    fontSize: 13,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    color: over ? "rgba(255,69,58,0.9)" : actual ? "var(--prv-text-1)" : "var(--prv-text-2)",
    fontWeight: actual ? 640 : 400,
  }
}

export function ProjectBudgetClient({ id }: { id: string }) {
  const { data, isLoading } = useProjectBudget(id)

  const lines = data?.lines ?? []
  const byCat = new Map(lines.map((l) => [l.category, l]))
  const ordered: BudgetLine[] = CATEGORY_ORDER.map(
    (c) =>
      byCat.get(c) ?? {
        category: c,
        plannedAmount: 0,
        committedAmount: 0,
        actualAmount: 0,
        notes: null,
      }
  )
  const totals = data?.totals ?? { planned: 0, committed: 0, actual: 0 }
  const eva = data?.eva
  const progress = data?.progress
  const health = eva ? (HEALTH[eva.healthBand] ?? HEALTH.green) : HEALTH.green

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 4px 60px" }}>
      <Link
        href={`/projects/${id}`}
        style={{
          fontSize: 12.5,
          color: "var(--prv-text-3)",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 12,
        }}
      >
        ‹ Back to project
      </Link>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--prv-text-3)",
        }}
      >
        Project · Budget
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 680, letterSpacing: "-0.02em", margin: "3px 0 4px" }}>
        Budget & EVA
      </h1>
      {progress && (
        <div style={{ fontSize: 13, color: "var(--prv-text-2)", marginBottom: 20 }}>
          {Math.round(progress.percentComplete * 100)}% complete ·{" "}
          {Math.round(progress.scheduleFraction * 100)}% of schedule elapsed
        </div>
      )}

      {isLoading ? (
        <p style={{ padding: "40px 20px", textAlign: "center", color: "var(--prv-text-4)" }}>
          Loading budget…
        </p>
      ) : (
        <>
          {eva && (
            <div
              style={{
                borderRadius: 20,
                padding: "14px 18px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: health!.bg,
                border: `1px solid ${health!.border}`,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 680, color: health!.color }}>
                {health!.label}
              </span>
              <span style={{ fontSize: 12.5, color: "var(--prv-text-2)", marginLeft: "auto" }}>
                Forecast {eur(eva.eac)} vs {eur(eva.bac)} budget
              </span>
            </div>
          )}

          {eva && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                marginBottom: 22,
              }}
            >
              <Metric k="BAC" v={eur(eva.bac)} hint="Budget at completion" />
              <Metric
                k="EAC"
                v={eur(eva.eac)}
                hint="Estimate at completion"
                tone={eva.eac > eva.bac ? "warn" : undefined}
              />
              <Metric k="ETC" v={eur(eva.etc)} hint="Estimate to complete" />
              <Metric
                k="CPI"
                v={eva.cpi === null ? "—" : eva.cpi.toFixed(2)}
                hint="Cost performance"
                tone={eva.cpi === null ? undefined : eva.cpi < 1 ? "bad" : "good"}
              />
              <Metric
                k="SPI"
                v={eva.spi === null ? "—" : eva.spi.toFixed(2)}
                hint="Schedule performance"
                tone={eva.spi === null ? undefined : eva.spi < 1 ? "bad" : "good"}
              />
              <Metric
                k="Burn rate"
                v={eva.burnRate === null ? "—" : `${eur(eva.burnRate)}/wk`}
                hint="Avg weekly spend"
              />
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
            Budget by category
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                gap: 8,
                padding: "11px 16px",
                borderBottom: "1px solid var(--prv-border-subtle)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--prv-text-3)",
              }}
            >
              <span>Category</span>
              <span style={{ textAlign: "right" }}>Planned</span>
              <span style={{ textAlign: "right" }}>Committed</span>
              <span style={{ textAlign: "right" }}>Actual</span>
            </div>
            {ordered.map((l) => (
              <CategoryRow key={l.category} line={l} />
            ))}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                gap: 8,
                padding: "13px 16px",
                borderTop: "1px solid var(--prv-border)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>Total</span>
              <span style={amt()}>{eur(totals.planned)}</span>
              <span style={amt()}>{eur(totals.committed)}</span>
              <span style={amt(true)}>{eur(totals.actual)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
