// Project risk scoring (roadmap 6.6).
//
// Classic 5×5 risk matrix: severity = impact × probability (both 1–5), giving a
// 1–25 score bucketed into four bands. Pure + unit-tested so the API and UI
// agree on the same thresholds.

export type RiskBand = "low" | "medium" | "high" | "critical"

export interface RiskScore {
  score: number
  band: RiskBand
}

function clamp1to5(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.min(5, Math.round(n)))
}

export function riskBand(score: number): RiskBand {
  if (score >= 15) return "critical"
  if (score >= 8) return "high"
  if (score >= 4) return "medium"
  return "low"
}

export function scoreRisk(impact: number, probability: number): RiskScore {
  const score = clamp1to5(impact) * clamp1to5(probability)
  return { score, band: riskBand(score) }
}
