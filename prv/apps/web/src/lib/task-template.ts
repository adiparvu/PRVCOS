// Phase 6.2 — Task templates (pure logic).
//
// A template is a reusable checklist of task definitions saved on the company and
// applied to any project to create real tasks in bulk. Items are validated and
// normalized here so both the CRUD API and the apply endpoint share one contract.

export const TASK_PRIORITIES = ["low", "medium", "high", "critical"] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export interface TaskTemplateItem {
  title: string
  description: string | null
  priority: TaskPriority
  estimatedHours: string | null
}

function isPriority(v: unknown): v is TaskPriority {
  return typeof v === "string" && (TASK_PRIORITIES as readonly string[]).includes(v)
}

function normHours(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : parseFloat(String(v))
  if (!Number.isFinite(n) || n < 0) return null
  return (Math.round(n * 100) / 100).toFixed(2)
}

// Normalize arbitrary input into a clean item list: titles are required and
// trimmed (≤255), descriptions trimmed to null, priority defaults to "medium",
// hours parsed to a 2dp string or null. Items without a usable title are dropped.
export function normalizeTemplateItems(raw: unknown): TaskTemplateItem[] {
  if (!Array.isArray(raw)) return []
  const out: TaskTemplateItem[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const e = entry as Record<string, unknown>
    const title = typeof e["title"] === "string" ? e["title"].trim().slice(0, 255) : ""
    if (!title) continue
    const description =
      typeof e["description"] === "string" && e["description"].trim()
        ? e["description"].trim().slice(0, 2000)
        : null
    out.push({
      title,
      description,
      priority: isPriority(e["priority"]) ? e["priority"] : "medium",
      estimatedHours: normHours(e["estimatedHours"]),
    })
  }
  return out
}

export interface BuiltTask {
  companyId: string
  projectId: string
  title: string
  description: string | null
  priority: TaskPriority
  estimatedHours: string | null
  status: "backlog"
  orderIndex: number
}

// Expand a template into task rows for a project. orderIndex continues from the
// board's current max so applied tasks land after existing ones.
export function buildTasksFromTemplate(
  items: TaskTemplateItem[],
  opts: { companyId: string; projectId: string; startOrderIndex: number }
): BuiltTask[] {
  const start = Number.isFinite(opts.startOrderIndex) ? opts.startOrderIndex : 0
  return items.map((it, i) => ({
    companyId: opts.companyId,
    projectId: opts.projectId,
    title: it.title,
    description: it.description,
    priority: it.priority,
    estimatedHours: it.estimatedHours,
    status: "backlog" as const,
    orderIndex: start + i + 1,
  }))
}
