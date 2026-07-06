// Executive Cockpit logic (roadmap 16.1/16.2). Pure + unit-tested.
//
// The cockpit composes the existing analytics signals into a single CEO-level
// read. This module holds the small amount of real logic behind that view: how
// a 0–100 health score maps to an executive label, how the individual panel
// signals reduce to one overall posture, and the one-line executive briefing.

export type Tone = "good" | "amber" | "red"

export interface Posture {
  label: string
  tone: Tone
}

/**
 * Map a composite health score to an executive label + tone, using the Phase
 * 16.2 thresholds (Excellent / Good / Attention needed / Critical).
 */
export function scoreLabel(score: number): Posture {
  const s = Number.isFinite(score) ? score : 0
  if (s >= 90) return { label: "Excellent", tone: "good" }
  if (s >= 70) return { label: "Good", tone: "good" }
  if (s >= 50) return { label: "Attention needed", tone: "amber" }
  return { label: "Critical", tone: "red" }
}

export interface CockpitSignals {
  healthScore: number
  criticalAlerts: number // critical anomalies / alerts
  openSafetyCritical: boolean // an open critical-band safety posture
  stockoutRisk: number // products at stockout risk
  attendanceWatch: number // employees below the attendance threshold
}

const toneRank: Record<Tone, number> = { good: 0, amber: 1, red: 2 }

const TONES: Tone[] = ["good", "amber", "red"]

/** Reduce the panel signals into one overall cockpit posture. */
export function cockpitPosture(s: CockpitSignals): Posture {
  let worst = toneRank[scoreLabel(s.healthScore).tone]
  if (s.criticalAlerts > 0 || s.openSafetyCritical) worst = Math.max(worst, toneRank.red)
  if (s.stockoutRisk > 0 || s.attendanceWatch > 0) worst = Math.max(worst, toneRank.amber)

  const tone = TONES[worst] ?? "good"
  const label = tone === "red" ? "Needs attention" : tone === "amber" ? "Watch" : "Healthy"
  return { label, tone }
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/**
 * One-line executive briefing summarising the cockpit — a rule-based stand-in
 * until the Phase 17 AI briefing connects. Always leads with the health score,
 * then appends only the signals that actually need attention.
 */
export function cockpitBriefing(s: CockpitSignals): string {
  const parts: string[] = [`Company health ${Math.round(s.healthScore)}/100`]
  if (s.criticalAlerts > 0)
    parts.push(plural(s.criticalAlerts, "critical alert", "critical alerts"))
  if (s.openSafetyCritical) parts.push("an open critical safety incident")
  if (s.stockoutRisk > 0) parts.push(plural(s.stockoutRisk, "stockout risk", "stockout risks"))
  if (s.attendanceWatch > 0)
    parts.push(plural(s.attendanceWatch, "employee below target", "employees below target"))
  if (parts.length === 1) return `${parts[0]} — all systems nominal.`
  const tail = parts.slice(1)
  const last = tail.pop()
  const joined = tail.length ? `${tail.join(", ")} and ${last}` : last
  return `${parts[0]}, with ${joined}.`
}
