// CEO Daily Briefing — rule-based (roadmap 16.1 panel 8 / 17.4). Pure +
// unit-tested.
//
// Composes the existing executive signals into a narrative morning brief: a
// posture headline plus themed sections (Money, Operations, People, Risk) in
// plain language. This is the deterministic precursor the Phase 17 AI briefing
// will replace with Claude-authored prose; the structure and data are the same.

export type Posture = "healthy" | "watch" | "attention"

export interface BriefingInput {
  healthScore: number
  revenueDeltaPct: number | null // vs previous period
  portfolioProfit: number // total project profit
  marginPct: number
  activeProjects: number
  lossMakingProjects: number
  attendanceRatePct: number | null
  attendanceWatch: number // employees below threshold
  openSafety: number // open safety incidents
  safetyInjuries: number
  stockoutRisk: number // products at stockout risk
  criticalAlerts: number
}

export interface BriefingSection {
  title: string
  lines: string[]
}

export interface DailyBriefing {
  posture: Posture
  headline: string
  sections: BriefingSection[]
}

function eur(n: number): string {
  const abs = Math.abs(n)
  const s = abs >= 1000 ? `€${(abs / 1000).toFixed(1)}k` : `€${Math.round(abs)}`
  return n < 0 ? `-${s}` : s
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function postureOf(input: BriefingInput): Posture {
  if (input.healthScore < 50 || input.criticalAlerts > 0 || input.openSafety > 0) return "attention"
  if (input.healthScore < 70 || input.stockoutRisk > 0 || input.attendanceWatch > 0) return "watch"
  return "healthy"
}

/**
 * Compose the executive signals into a themed daily briefing. Empty sections are
 * dropped; a fully-nominal company still gets a reassuring headline.
 */
export function composeDailyBriefing(input: BriefingInput): DailyBriefing {
  const posture = postureOf(input)
  const health = Math.round(input.healthScore)

  const headline =
    posture === "attention"
      ? `Company health ${health}/100 — items need your attention today.`
      : posture === "watch"
        ? `Company health ${health}/100 — a few things worth a look.`
        : `Company health ${health}/100 — all systems nominal.`

  const money: string[] = []
  if (input.revenueDeltaPct !== null) {
    const d = Math.round(input.revenueDeltaPct)
    money.push(
      d === 0
        ? "Revenue is flat versus the previous period."
        : `Revenue is ${d > 0 ? "up" : "down"} ${Math.abs(d)}% versus the previous period.`
    )
  }
  money.push(
    `Portfolio profit stands at ${eur(input.portfolioProfit)} on a ${input.marginPct}% margin.`
  )

  const ops: string[] = [
    `${plural(input.activeProjects, "active project", "active projects")} in flight.`,
  ]
  if (input.lossMakingProjects > 0) {
    ops.push(
      `${plural(input.lossMakingProjects, "project is", "projects are")} currently loss-making.`
    )
  }

  const people: string[] = []
  if (input.attendanceRatePct !== null) {
    people.push(`Attendance is running at ${input.attendanceRatePct}%.`)
  }
  if (input.attendanceWatch > 0) {
    people.push(
      `${plural(input.attendanceWatch, "employee is", "employees are")} below the attendance threshold.`
    )
  }

  const risk: string[] = []
  if (input.criticalAlerts > 0) {
    risk.push(
      `${plural(input.criticalAlerts, "critical alert needs", "critical alerts need")} triage.`
    )
  }
  if (input.openSafety > 0) {
    const injury =
      input.safetyInjuries > 0
        ? ` with ${plural(input.safetyInjuries, "recorded injury", "recorded injuries")}`
        : ""
    risk.push(
      `${plural(input.openSafety, "open safety incident", "open safety incidents")}${injury}.`
    )
  }
  if (input.stockoutRisk > 0) {
    risk.push(`${plural(input.stockoutRisk, "product is", "products are")} at stockout risk.`)
  }
  if (risk.length === 0) {
    risk.push("No critical alerts, safety incidents, or stockout risks.")
  }

  const sections: BriefingSection[] = [
    { title: "Money", lines: money },
    { title: "Operations", lines: ops },
    { title: "People", lines: people },
    { title: "Risk", lines: risk },
  ].filter((s) => s.lines.length > 0)

  return { posture, headline, sections }
}
