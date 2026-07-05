// Employee ROI — cross-module BI (roadmap 15.6). Pure + unit-tested.
//
// Combines payroll cost (HR) with delivery output (completed project tasks) into
// a per-employee cost-per-task and an output band, plus a team roll-up. This is
// a proxy for productivity — a low cost-per-task means high delivery per euro.

export interface EmployeeRoiInput {
  userId: string
  name: string
  payrollCost: number // total gross paid
  tasksCompleted: number
}

export type OutputBand = "high" | "steady" | "low" | "no_output"

export interface EmployeeRoi {
  userId: string
  name: string
  payrollCost: number
  tasksCompleted: number
  costPerTask: number | null // null when no tasks completed
  band: OutputBand
}

export interface RoiSummary {
  employees: EmployeeRoi[]
  totalCost: number
  totalTasks: number
  avgCostPerTask: number | null
  noOutputCount: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
function safe(n: number): number {
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/**
 * Band an employee by cost-per-task relative to the team average. High output =
 * meaningfully cheaper per task than average; low = meaningfully more expensive.
 */
function bandFor(costPerTask: number | null, avg: number | null): OutputBand {
  if (costPerTask === null) return "no_output"
  if (avg === null || avg <= 0) return "steady"
  if (costPerTask <= avg * 0.75) return "high"
  if (costPerTask >= avg * 1.25) return "low"
  return "steady"
}

/**
 * Build per-employee ROI + a team roll-up. Employees are ranked by output —
 * those who completed tasks first (cheapest cost-per-task first), no-output last.
 */
export function computeEmployeeRoi(inputs: EmployeeRoiInput[]): RoiSummary {
  const totalCost = round2(inputs.reduce((s, e) => s + safe(e.payrollCost), 0))
  const totalTasks = inputs.reduce((s, e) => s + Math.floor(safe(e.tasksCompleted)), 0)
  // Team average cost-per-task over employees who delivered anything.
  const withOutput = inputs.filter((e) => Math.floor(safe(e.tasksCompleted)) > 0)
  const withOutputCost = withOutput.reduce((s, e) => s + safe(e.payrollCost), 0)
  const withOutputTasks = withOutput.reduce((s, e) => s + Math.floor(safe(e.tasksCompleted)), 0)
  const avgCostPerTask = withOutputTasks > 0 ? round2(withOutputCost / withOutputTasks) : null

  const employees: EmployeeRoi[] = inputs.map((e) => {
    const cost = round2(safe(e.payrollCost))
    const tasks = Math.floor(safe(e.tasksCompleted))
    const costPerTask = tasks > 0 ? round2(cost / tasks) : null
    return {
      userId: e.userId,
      name: e.name,
      payrollCost: cost,
      tasksCompleted: tasks,
      costPerTask,
      band: bandFor(costPerTask, avgCostPerTask),
    }
  })

  employees.sort((a, b) => {
    if (a.costPerTask === null && b.costPerTask === null) return b.tasksCompleted - a.tasksCompleted
    if (a.costPerTask === null) return 1
    if (b.costPerTask === null) return -1
    return a.costPerTask - b.costPerTask
  })

  return {
    employees,
    totalCost,
    totalTasks,
    avgCostPerTask,
    noOutputCount: employees.filter((e) => e.band === "no_output").length,
  }
}
