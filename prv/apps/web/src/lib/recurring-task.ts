// Phase 6.2 — Recurring tasks (pure logic).
//
// Scheduling (frequency, next-run, due checks) is shared with report schedules
// via ./report-schedule; this module only builds the generated task row and
// labels the frequency, so the CRUD API and the generator job agree on shape.
import { type ReportFrequency } from "./report-schedule"

export type RecurringFrequency = ReportFrequency

export interface RecurringTaskConfig {
  companyId: string
  projectId: string
  title: string
  description: string | null
  priority: "low" | "medium" | "high" | "critical"
  estimatedHours: string | null
  assigneeId: string | null
}

export interface GeneratedTask {
  companyId: string
  projectId: string
  title: string
  description: string | null
  priority: "low" | "medium" | "high" | "critical"
  estimatedHours: string | null
  assigneeId: string | null
  status: "backlog"
  orderIndex: number
}

// Build the projectTasks insert row for one generated occurrence. Generated tasks
// land in backlog after the current max order so they don't reshuffle the board.
export function buildRecurringTask(
  cfg: RecurringTaskConfig,
  opts: { startOrderIndex: number }
): GeneratedTask {
  const start = Number.isFinite(opts.startOrderIndex) ? opts.startOrderIndex : 0
  return {
    companyId: cfg.companyId,
    projectId: cfg.projectId,
    title: cfg.title,
    description: cfg.description,
    priority: cfg.priority,
    estimatedHours: cfg.estimatedHours,
    assigneeId: cfg.assigneeId,
    status: "backlog",
    orderIndex: start + 1,
  }
}

export function recurringFrequencyLabel(freq: RecurringFrequency): string {
  if (freq === "daily") return "Zilnic"
  if (freq === "weekly") return "Săptămânal"
  return "Lunar"
}
