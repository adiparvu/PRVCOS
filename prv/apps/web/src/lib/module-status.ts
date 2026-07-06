// Module status board — Universal Dashboard (roadmap 16.3). Pure + unit-tested.
//
// Derives an operational health indicator for each module from the audit log:
// how much activity it saw in the window and whether any access-control (gate)
// checks failed. This is genuine operational health — activity + security
// posture — rather than a fabricated score, so a module with no recent events
// reads as "idle" rather than falsely "healthy".

export interface AuditEventInput {
  entityType: string | null
  gateFailed: boolean
  createdAt: string // ISO
}

export type ModuleState = "alert" | "active" | "idle"

export interface ModuleDef {
  key: string
  label: string
  href: string
  entityTypes: string[] // audit entityType values that belong to this module
}

// The core modules tracked on the board and the audit entity types that map to
// each. Entity types not listed here fall into the catch-all "Other" module.
export const MODULE_REGISTRY: ModuleDef[] = [
  {
    key: "projects",
    label: "Projects",
    href: "/projects",
    entityTypes: ["project", "task", "milestone", "risk"],
  },
  {
    key: "finance",
    label: "Finance",
    href: "/finance",
    entityTypes: ["invoice", "expense", "payroll", "payment", "supplier_invoice", "forecast"],
  },
  {
    key: "shop",
    label: "Shop",
    href: "/shop",
    entityTypes: ["order", "product", "stock", "stock_movement", "return", "promotion"],
  },
  {
    key: "crm",
    label: "CRM",
    href: "/crm",
    entityTypes: ["lead", "customer", "contact", "activity", "deal"],
  },
  {
    key: "workforce",
    label: "Workforce",
    href: "/workforce",
    entityTypes: ["employee", "attendance", "shift", "leave", "contract", "review"],
  },
  {
    key: "safety",
    label: "Safety",
    href: "/safety",
    entityTypes: ["safety_incident", "inspection", "briefing"],
  },
  {
    key: "documents",
    label: "Documents",
    href: "/documents",
    entityTypes: ["document", "share", "folder"],
  },
  { key: "alerts", label: "Command Center", href: "/alerts", entityTypes: ["alert", "anomaly"] },
]

const OTHER: ModuleDef = { key: "other", label: "Other", href: "/audit-logs", entityTypes: [] }

export interface ModuleTile {
  key: string
  label: string
  href: string
  events: number
  failures: number
  lastActivity: string | null // ISO of most recent event, null when idle
  state: ModuleState
}

export interface ModuleStatusResult {
  windowHours: number
  modules: ModuleTile[]
  summary: { totalEvents: number; totalFailures: number; activeModules: number }
}

const STATE_RANK: Record<ModuleState, number> = { alert: 0, active: 1, idle: 2 }

function moduleKeyFor(entityType: string | null): string {
  if (!entityType) return OTHER.key
  const hit = MODULE_REGISTRY.find((m) => m.entityTypes.includes(entityType))
  return hit ? hit.key : OTHER.key
}

interface Acc {
  events: number
  failures: number
  lastMs: number
}

/**
 * Aggregate audit events into a per-module operational status board over the
 * trailing `windowHours`. Every registered module is always present (idle when
 * it saw no events); unmapped entity types collect under "Other" only if they
 * had activity.
 */
export function computeModuleStatus(
  events: AuditEventInput[],
  windowHours: number
): ModuleStatusResult {
  const acc = new Map<string, Acc>()
  for (const m of MODULE_REGISTRY) acc.set(m.key, { events: 0, failures: 0, lastMs: 0 })

  let totalEvents = 0
  let totalFailures = 0

  for (const e of events) {
    const key = moduleKeyFor(e.entityType)
    let a = acc.get(key)
    if (!a) {
      a = { events: 0, failures: 0, lastMs: 0 }
      acc.set(key, a)
    }
    a.events += 1
    totalEvents += 1
    if (e.gateFailed) {
      a.failures += 1
      totalFailures += 1
    }
    const ts = Date.parse(e.createdAt)
    if (Number.isFinite(ts) && ts > a.lastMs) a.lastMs = ts
  }

  const defFor = (key: string): ModuleDef => MODULE_REGISTRY.find((m) => m.key === key) ?? OTHER

  const modules: ModuleTile[] = [...acc.entries()]
    .filter(([key, a]) => key !== OTHER.key || a.events > 0) // hide empty "Other"
    .map(([key, a]) => {
      const def = defFor(key)
      const state: ModuleState = a.failures > 0 ? "alert" : a.events > 0 ? "active" : "idle"
      return {
        key,
        label: def.label,
        href: def.href,
        events: a.events,
        failures: a.failures,
        lastActivity: a.lastMs > 0 ? new Date(a.lastMs).toISOString() : null,
        state,
      }
    })
    .sort(
      (x, y) =>
        STATE_RANK[x.state] - STATE_RANK[y.state] ||
        y.events - x.events ||
        x.label.localeCompare(y.label)
    )

  return {
    windowHours,
    modules,
    summary: {
      totalEvents,
      totalFailures,
      activeModules: modules.filter((m) => m.state !== "idle").length,
    },
  }
}
