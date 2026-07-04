// KPI anomaly detection (roadmap 15.6, threshold-based). Pure + unit-tested.
//
// Flags metrics whose latest day-over-day move exceeds a threshold. Severity is
// scaled by the magnitude of the move; `favourable` follows the metric's
// goodWhen so a big drop in overdue AR reads as good, not alarming.

import { pctChange, type MetricDef, type TrendDirection } from "@/lib/kpi-trends"

export type AnomalySeverity = "warning" | "critical"

export interface Anomaly {
  key: string
  label: string
  format: MetricDef["format"]
  current: number
  previous: number
  deltaPct: number // signed
  direction: TrendDirection
  severity: AnomalySeverity
  favourable: boolean
}

export interface AnomalyOptions {
  warnPct?: number // |Δ%| at/above → warning (default 25)
  criticalPct?: number // |Δ%| at/above → critical (default 50)
}

/**
 * Detect day-over-day anomalies from a chronological (oldest → newest) list of
 * snapshot rows. Compares the newest row to the one before it. Returns anomalies
 * ordered most-severe first (critical before warning, larger move first).
 */
export function detectAnomalies(
  rows: Record<string, unknown>[],
  metrics: MetricDef[],
  opts: AnomalyOptions = {}
): Anomaly[] {
  const warn = opts.warnPct ?? 25
  const critical = opts.criticalPct ?? 50
  if (rows.length < 2) return []

  const latest = rows[rows.length - 1]!
  const prior = rows[rows.length - 2]!

  const out: Anomaly[] = []
  for (const m of metrics) {
    const current = Number(latest[m.key] ?? 0)
    const previous = Number(prior[m.key] ?? 0)
    const cur = Number.isFinite(current) ? current : 0
    const prev = Number.isFinite(previous) ? previous : 0
    const deltaPct = pctChange(cur, prev)
    const mag = Math.abs(deltaPct)
    if (mag < warn) continue

    const direction: TrendDirection = deltaPct > 0 ? "up" : deltaPct < 0 ? "down" : "flat"
    const goodWhen = m.goodWhen ?? "up"
    const favourable = direction === "flat" ? true : (direction === "up") === (goodWhen === "up")
    out.push({
      key: m.key,
      label: m.label,
      format: m.format,
      current: cur,
      previous: prev,
      deltaPct,
      direction,
      severity: mag >= critical ? "critical" : "warning",
      favourable,
    })
  }

  const rank: Record<AnomalySeverity, number> = { critical: 0, warning: 1 }
  return out.sort(
    (a, b) => rank[a.severity] - rank[b.severity] || Math.abs(b.deltaPct) - Math.abs(a.deltaPct)
  )
}
