// CRM activity workflow helpers (roadmap 10.4). Pure + unit-tested.

export type CrmActivityType =
  | "call"
  | "email"
  | "meeting"
  | "demo"
  | "proposal"
  | "follow_up"
  | "note"
  | "task"

export const CRM_ACTIVITY_TYPES: CrmActivityType[] = [
  "call",
  "email",
  "meeting",
  "demo",
  "proposal",
  "follow_up",
  "note",
  "task",
]

// An activity is one of three derived states:
//   done      — has a completedAt
//   overdue   — not done, has a dueAt in the past
//   scheduled — not done, dueAt in the future (or no due date → just open)
export type CrmActivityState = "done" | "overdue" | "scheduled"

export interface ActivityLike {
  dueAt: string | null
  completedAt: string | null
}

export function activityState(a: ActivityLike, nowMs: number): CrmActivityState {
  if (a.completedAt) return "done"
  if (a.dueAt) {
    const due = Date.parse(a.dueAt)
    if (Number.isFinite(due) && due < nowMs) return "overdue"
  }
  return "scheduled"
}

export function isOverdue(a: ActivityLike, nowMs: number): boolean {
  return activityState(a, nowMs) === "overdue"
}

export interface ActivitySummary {
  total: number
  open: number // not done
  overdue: number
  done: number
  byType: Record<CrmActivityType, number>
}

export function summarizeActivities(items: ActivityLike[], nowMs: number): ActivitySummary {
  const byType = Object.fromEntries(CRM_ACTIVITY_TYPES.map((t) => [t, 0])) as Record<
    CrmActivityType,
    number
  >
  let open = 0
  let overdue = 0
  let done = 0
  for (const a of items) {
    const state = activityState(a, nowMs)
    if (state === "done") done += 1
    else {
      open += 1
      if (state === "overdue") overdue += 1
    }
    const withType = a as ActivityLike & { type?: CrmActivityType }
    if (withType.type && byType[withType.type] !== undefined) byType[withType.type] += 1
  }
  return { total: items.length, open, overdue, done, byType }
}

/**
 * Timeline sort: open activities first (soonest due first, overdue at the very
 * top), then completed activities most-recent first. Deterministic and stable.
 */
export function sortActivities<T extends ActivityLike & { createdAt?: string }>(
  items: T[],
  nowMs: number
): T[] {
  return [...items].sort((a, b) => {
    const aDone = a.completedAt ? 1 : 0
    const bDone = b.completedAt ? 1 : 0
    if (aDone !== bDone) return aDone - bDone // open (0) before done (1)

    if (!a.completedAt && !b.completedAt) {
      // Both open: order by due date ascending; no-due sinks to the bottom.
      const ad = a.dueAt ? Date.parse(a.dueAt) : Infinity
      const bd = b.dueAt ? Date.parse(b.dueAt) : Infinity
      if (ad !== bd) return ad - bd
      return 0
    }
    // Both done: most-recently completed first.
    const ac = Date.parse(a.completedAt ?? "")
    const bc = Date.parse(b.completedAt ?? "")
    return (Number.isFinite(bc) ? bc : 0) - (Number.isFinite(ac) ? ac : 0)
  })
}
