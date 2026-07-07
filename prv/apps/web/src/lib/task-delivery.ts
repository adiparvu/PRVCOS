// Task delivery analytics — Projects execution (roadmap Phase 6.2). Pure +
// unit-tested.
//
// Turns the project task board into a delivery health view: the status mix,
// completion rate over non-cancelled tasks, the overdue backlog, the on-time
// delivery rate (tasks completed by their due date), and the open work by
// priority so a delivery lead sees what is in flight and what is slipping.

export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done" | "cancelled"
export type TaskPriority = "low" | "medium" | "high" | "critical"

export interface TaskInput {
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null // YYYY-MM-DD
  completedAt: string | null // ISO
}

export interface PriorityBucket {
  priority: TaskPriority
  open: number
  total: number
}

export interface TaskDelivery {
  total: number
  done: number
  cancelled: number
  open: number // not done, not cancelled
  overdue: number // open with a past due date
  completionRatePct: number | null // done / (total − cancelled)
  onTimeRatePct: number | null // on-time completions / completions with a due date
  byStatus: Record<TaskStatus, number>
  byPriority: PriorityBucket[] // critical → low
}

const OPEN_EXCLUDED = new Set<TaskStatus>(["done", "cancelled"])
const PRIORITY_ORDER: TaskPriority[] = ["critical", "high", "medium", "low"]

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Aggregate project tasks into a delivery health view as of `nowMs`. */
export function computeTaskDelivery(tasks: TaskInput[], nowMs: number): TaskDelivery {
  const today = new Date(nowMs).toISOString().slice(0, 10)

  const byStatus: Record<TaskStatus, number> = {
    backlog: 0,
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
    cancelled: 0,
  }
  const priorityMap = new Map<TaskPriority, { open: number; total: number }>()

  let overdue = 0
  let onTimeDone = 0
  let doneWithDue = 0

  for (const t of tasks) {
    if (t.status in byStatus) byStatus[t.status] += 1

    const isOpen = !OPEN_EXCLUDED.has(t.status)
    if (isOpen && t.dueDate !== null && t.dueDate < today) overdue += 1

    if (t.status === "done" && t.dueDate !== null) {
      doneWithDue += 1
      // Completed on or before the due date counts as on time.
      const completedDay = t.completedAt ? t.completedAt.slice(0, 10) : null
      if (completedDay !== null && completedDay <= t.dueDate) onTimeDone += 1
    }

    const p = priorityMap.get(t.priority) ?? { open: 0, total: 0 }
    p.total += 1
    if (isOpen) p.open += 1
    priorityMap.set(t.priority, p)
  }

  const total = tasks.length
  const done = byStatus.done
  const cancelled = byStatus.cancelled
  const open = total - done - cancelled
  const denom = total - cancelled

  const byPriority: PriorityBucket[] = PRIORITY_ORDER.filter((p) => priorityMap.has(p)).map((p) => {
    const v = priorityMap.get(p)!
    return { priority: p, open: v.open, total: v.total }
  })

  return {
    total,
    done,
    cancelled,
    open,
    overdue,
    completionRatePct: denom > 0 ? round1((done / denom) * 100) : null,
    onTimeRatePct: doneWithDue > 0 ? round1((onTimeDone / doneWithDue) * 100) : null,
    byStatus,
    byPriority,
  }
}
