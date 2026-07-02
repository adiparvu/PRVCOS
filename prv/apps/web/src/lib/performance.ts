// Performance metric math (roadmap 7.5). Pure + unit-tested so the API and the
// heatmap agree on rates and the composite score.

export interface PerformanceInput {
  /** Days the employee was expected in (present + late + absent + clocked_out; leave excluded). */
  scheduledDays: number
  /** Days actually worked (present + late + clocked_out). */
  presentDays: number
  /** Present days with no lateness. */
  onTimeDays: number
  totalTasks: number
  doneTasks: number
  /** Latest manager rating 1–5, or null. */
  rating: number | null
}

export interface PerformanceResult {
  attendanceRate: number | null
  punctualityRate: number | null
  taskCompletionRate: number | null
  ratingPct: number | null
  /** Weighted composite over available metrics, 0–100, or null when none apply. */
  composite: number | null
}

function pct(n: number, d: number): number | null {
  if (d <= 0) return null
  return Math.round((n / d) * 1000) / 10
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

const WEIGHTS = { attendance: 0.3, punctuality: 0.2, tasks: 0.3, rating: 0.2 }

export function computePerformance(input: PerformanceInput): PerformanceResult {
  const attendanceRate = pct(input.presentDays, input.scheduledDays)
  const punctualityRate = pct(input.onTimeDays, input.presentDays)
  const taskCompletionRate = pct(input.doneTasks, input.totalTasks)
  const ratingPct =
    input.rating == null
      ? null
      : Math.round((Math.max(0, Math.min(5, input.rating)) / 5) * 1000) / 10

  // Weighted composite over whichever metrics are available (renormalized).
  const parts: [number, number][] = []
  if (attendanceRate != null) parts.push([WEIGHTS.attendance, attendanceRate])
  if (punctualityRate != null) parts.push([WEIGHTS.punctuality, punctualityRate])
  if (taskCompletionRate != null) parts.push([WEIGHTS.tasks, taskCompletionRate])
  if (ratingPct != null) parts.push([WEIGHTS.rating, ratingPct])

  const totalWeight = parts.reduce((s, [w]) => s + w, 0)
  const composite =
    totalWeight > 0 ? round1(parts.reduce((s, [w, v]) => s + w * v, 0) / totalWeight) : null

  return { attendanceRate, punctualityRate, taskCompletionRate, ratingPct, composite }
}
