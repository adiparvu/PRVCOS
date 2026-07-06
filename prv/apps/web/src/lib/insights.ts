// Command Center Insights — rule-based (roadmap 16.5). Pure + unit-tested.
//
// Turns the composed analytics signals into ranked, actionable executive
// insights — the threshold-based precursor to the Phase 17 AI insights. Each
// rule emits zero or more insight cards; the result is ordered most-severe
// first so the CEO sees what matters at the top.

export type InsightSeverity = "info" | "warning" | "critical"

export interface Insight {
  id: string
  severity: InsightSeverity
  title: string
  detail: string
  href: string
}

export interface InsightInput {
  healthScore: number
  projects: {
    name: string
    band: string // "profitable" | "thin" | "loss"
    profit: number
    marginPct: number
    budgetUsedPct: number
  }[]
  attendanceWatch: { name: string; attendanceRate: number; band: string }[]
  safety: { open: number; riskBand: string; riskIndex: number; injuries: number }
  anomalies: { label: string; deltaPct: number; severity: string; favourable: boolean }[]
  demand: { name: string; band: string; daysOfCover: number | null; suggestedReorderQty: number }[]
}

const SEVERITY_RANK: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 }

function eur(n: number): string {
  const abs = Math.abs(n)
  const s = abs >= 1000 ? `€${(abs / 1000).toFixed(1)}k` : `€${Math.round(abs)}`
  return n < 0 ? `-${s}` : s
}

/**
 * Apply the Command Center rules to the composed signals and return the
 * resulting insights, most-severe first (stable within a severity).
 */
export function buildInsights(input: InsightInput): Insight[] {
  const out: Insight[] = []

  // Company health.
  if (input.healthScore < 50) {
    out.push({
      id: "health-critical",
      severity: "critical",
      title: `Company health critical at ${Math.round(input.healthScore)}/100`,
      detail: "Composite index below 50 — intervention recommended.",
      href: "/analytics/health",
    })
  } else if (input.healthScore < 70) {
    out.push({
      id: "health-attention",
      severity: "warning",
      title: `Company health needs attention (${Math.round(input.healthScore)}/100)`,
      detail: "Composite index below 70.",
      href: "/analytics/health",
    })
  }

  // Projects — over budget and/or loss-making.
  for (const p of input.projects) {
    if (p.budgetUsedPct > 100) {
      out.push({
        id: `project-overbudget-${p.name}`,
        severity: "warning",
        title: `${p.name} is ${Math.round(p.budgetUsedPct - 100)}% over budget`,
        detail: `Budget usage at ${Math.round(p.budgetUsedPct)}% — review recommended.`,
        href: "/analytics/project-profitability",
      })
    }
    if (p.band === "loss") {
      out.push({
        id: `project-loss-${p.name}`,
        severity: "warning",
        title: `${p.name} is loss-making`,
        detail: `Profit ${eur(p.profit)} at ${p.marginPct}% margin.`,
        href: "/analytics/project-profitability",
      })
    }
  }

  // Safety — open critical posture / injuries.
  if (input.safety.riskBand === "critical") {
    out.push({
      id: "safety-critical",
      severity: "critical",
      title: `Safety: ${input.safety.open} open incident${input.safety.open === 1 ? "" : "s"}, risk ${input.safety.riskIndex}`,
      detail:
        input.safety.injuries > 0
          ? `${input.safety.injuries} recorded injur${input.safety.injuries === 1 ? "y" : "ies"} — open critical incident.`
          : "An open critical-severity incident requires attention.",
      href: "/analytics/safety",
    })
  }

  // Critical anomalies.
  for (const a of input.anomalies) {
    if (a.severity === "critical") {
      out.push({
        id: `anomaly-${a.label}`,
        severity: "critical",
        title: `${a.label} moved ${a.deltaPct > 0 ? "+" : ""}${a.deltaPct}%`,
        detail: a.favourable ? "Unusual favourable swing." : "Unusual unfavourable swing.",
        href: "/analytics/anomalies",
      })
    }
  }

  // Inventory — stockout risk.
  for (const d of input.demand) {
    if (d.band === "critical") {
      out.push({
        id: `stockout-${d.name}`,
        severity: "critical",
        title: `${d.name} at stockout risk`,
        detail:
          d.daysOfCover === null
            ? `Below reorder point — order ${d.suggestedReorderQty} units.`
            : `${d.daysOfCover} days of cover left — order ${d.suggestedReorderQty} units.`,
        href: "/analytics/demand-forecast",
      })
    }
  }

  // Workforce — attendance cliffs.
  for (const w of input.attendanceWatch) {
    if (w.band === "poor") {
      out.push({
        id: `attendance-${w.name}`,
        severity: "warning",
        title: `${w.name} attendance at ${w.attendanceRate}%`,
        detail: "Below the 85% attendance floor.",
        href: "/analytics/attendance",
      })
    }
  }

  return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

export interface InsightSummary {
  total: number
  critical: number
  warning: number
}

/** Headline counts for the insight set. */
export function summarizeInsights(insights: Insight[]): InsightSummary {
  return {
    total: insights.length,
    critical: insights.filter((i) => i.severity === "critical").length,
    warning: insights.filter((i) => i.severity === "warning").length,
  }
}
