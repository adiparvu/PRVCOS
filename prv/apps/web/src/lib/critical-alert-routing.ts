// Critical-alert routing (Phase 14.5) — pure + unit-tested.
//
// Company-level critical alerts (cash below threshold, a missed milestone, a
// security event) have no single natural recipient the way an assigned incident
// or a permit requester does. Rather than guess an org chart, an admin DECLARES,
// per trigger, exactly which user receives that critical alert. This module is
// the catalog of routable triggers and the pure resolver the producers use.

export interface CriticalTrigger {
  key: string
  label: string
  group: "finance" | "operations" | "security"
}

// The curated set of routable critical triggers (roadmap 14.5). Triggers whose
// recipient is intrinsic (safety incident → assignee, permit → requester) are
// wired directly and are intentionally NOT here.
export const CRITICAL_TRIGGERS: CriticalTrigger[] = [
  { key: "finance.cash_below_threshold", label: "Cash sub prag", group: "finance" },
  { key: "finance.payment_failure", label: "Eșec de plată", group: "finance" },
  { key: "finance.fraud_flag", label: "Semnal de fraudă", group: "finance" },
  { key: "ops.milestone_missed", label: "Milestone ratat", group: "operations" },
  { key: "ops.system_outage", label: "Indisponibilitate sistem", group: "operations" },
  { key: "security.suspicious_login", label: "Autentificare suspectă", group: "security" },
  { key: "security.breach", label: "Breșă de securitate", group: "security" },
]

const TRIGGER_KEYS = new Set(CRITICAL_TRIGGERS.map((t) => t.key))

export function isCriticalTrigger(key: string): boolean {
  return TRIGGER_KEYS.has(key)
}

export interface CriticalAlertRoute {
  triggerKey: string
  routeToUserId: string
  isActive: boolean
}

/**
 * Resolve the explicit recipient for a trigger from the company's routes, or
 * null when no active route is configured — in which case the producer simply
 * does not raise a routed critical alert (never guesses a recipient).
 */
export function resolveRoute(routes: CriticalAlertRoute[], triggerKey: string): string | null {
  const r = routes.find((x) => x.triggerKey === triggerKey && x.isActive)
  return r ? r.routeToUserId : null
}
