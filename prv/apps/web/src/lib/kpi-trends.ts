// KPI trend + period-comparison helpers (roadmap 15.6). Pure + unit-tested.
//
// Turns a chronological series of daily KPI snapshots into per-metric trends:
// the latest value, the value at the start of the window, a delta %, a
// direction, and a sparkline series for rendering.

export type TrendDirection = "up" | "down" | "flat"
export type MetricFormat = "currency" | "number" | "percent"

export interface MetricDef {
  key: string
  label: string
  format: MetricFormat
  // For most KPIs up is good; for a few (e.g. overdue) down is good.
  goodWhen?: "up" | "down"
}

export interface KpiTrend {
  key: string
  label: string
  format: MetricFormat
  current: number
  previous: number
  deltaPct: number // signed, rounded to 1 decimal
  direction: TrendDirection
  positive: boolean // whether the movement is favourable
  sparkline: number[]
}

/** Signed percentage change from `previous` to `current`, rounded to 0.1. */
export function pctChange(current: number, previous: number): number {
  if (!Number.isFinite(previous) || previous === 0) {
    if (current === 0) return 0
    return current > 0 ? 100 : -100
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10
}

function directionOf(deltaPct: number): TrendDirection {
  if (deltaPct > 0) return "up"
  if (deltaPct < 0) return "down"
  return "flat"
}

/**
 * Build a trend for each metric from a chronological (oldest → newest) list of
 * snapshot rows. `current` is the newest value, `previous` the oldest in the
 * window.
 */
export function buildKpiTrends(rows: Record<string, unknown>[], metrics: MetricDef[]): KpiTrend[] {
  return metrics.map((m) => {
    const series = rows.map((r) => {
      const v = Number(r[m.key] ?? 0)
      return Number.isFinite(v) ? v : 0
    })
    const current = series.length ? series[series.length - 1]! : 0
    const previous = series.length ? series[0]! : 0
    const deltaPct = pctChange(current, previous)
    const direction = directionOf(deltaPct)
    const goodWhen = m.goodWhen ?? "up"
    const positive = direction === "flat" ? true : (direction === "up") === (goodWhen === "up")
    return {
      key: m.key,
      label: m.label,
      format: m.format,
      current,
      previous,
      deltaPct,
      direction,
      positive,
      sparkline: series,
    }
  })
}

// The headline KPIs surfaced on the trends board.
export const HEADLINE_METRICS: MetricDef[] = [
  { key: "revenueMonth", label: "Revenue (month)", format: "currency" },
  { key: "grossProfit", label: "Gross profit", format: "currency" },
  { key: "pipelineValue", label: "Pipeline value", format: "currency" },
  { key: "overdueAmount", label: "Overdue AR", format: "currency", goodWhen: "down" },
  { key: "activeProjects", label: "Active projects", format: "number" },
  { key: "activeLeads", label: "Active leads", format: "number" },
  { key: "headcount", label: "Headcount", format: "number" },
  { key: "healthScore", label: "Health score", format: "number" },
]
