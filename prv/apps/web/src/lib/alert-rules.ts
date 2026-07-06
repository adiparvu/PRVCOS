// Alert rules engine — automated triggers (roadmap 16.4/16.5). Pure +
// unit-tested.
//
// Evaluates composed business signals against the Command Center trigger table
// and emits alert specs at the appropriate severity (L1–L5). Each rule has a
// stable `ruleKey` used downstream as the alert `source` so a still-open alert
// for the same rule is not raised twice. Specs come back most-severe first.

export type AlertSeverity = "l1_info" | "l2_warning" | "l3_critical" | "l4_emergency" | "l5_crisis"

export interface AlertSpec {
  ruleKey: string
  severity: AlertSeverity
  title: string
  description: string
}

export interface AlertRuleInput {
  revenueDeltaPct: number | null // today vs previous snapshot, signed %
  cashPosition: number | null // current cash on hand
  cashThreshold: number // configured minimum cash floor
  attendanceRatePct: number | null // present / scheduled, 0–100
  openCriticalSafety: number // count of open critical safety incidents
  stockoutRisk: number // products at stockout risk
  overdueApprovalsOver48h: number // approvals pending > 48h
  healthScore: number // composite company health, 0–100
}

// Thresholds from the roadmap trigger table.
const REVENUE_DROP_PCT = -20 // drop worse than 20% → L2
const ATTENDANCE_FLOOR = 70 // below 70% of scheduled → L2
const HEALTH_FLOOR = 50 // composite below 50 → L3

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  l5_crisis: 0,
  l4_emergency: 1,
  l3_critical: 2,
  l2_warning: 3,
  l1_info: 4,
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/**
 * Apply the automated-trigger rules to the composed signals. Signals that are
 * null (not wired / unavailable) are skipped rather than treated as zero, so a
 * missing feed never raises a false alert. Result is most-severe first.
 */
export function evaluateAlertRules(input: AlertRuleInput): AlertSpec[] {
  const out: AlertSpec[] = []

  if (input.revenueDeltaPct !== null && input.revenueDeltaPct <= REVENUE_DROP_PCT) {
    out.push({
      ruleKey: "revenue_drop",
      severity: "l2_warning",
      title: `Revenue down ${Math.abs(Math.round(input.revenueDeltaPct))}%`,
      description: `Revenue moved ${Math.round(input.revenueDeltaPct)}% versus the previous period — review recommended.`,
    })
  }

  if (input.cashPosition !== null && input.cashPosition < input.cashThreshold) {
    out.push({
      ruleKey: "cash_low",
      severity: "l3_critical",
      title: "Cash position below threshold",
      description: `Cash on hand is under the configured minimum of ${input.cashThreshold}.`,
    })
  }

  if (input.attendanceRatePct !== null && input.attendanceRatePct < ATTENDANCE_FLOOR) {
    out.push({
      ruleKey: "attendance_cliff",
      severity: "l2_warning",
      title: `Attendance at ${Math.round(input.attendanceRatePct)}%`,
      description: "Attendance has dropped below 70% of scheduled — staffing risk.",
    })
  }

  if (input.overdueApprovalsOver48h > 0) {
    out.push({
      ruleKey: "approvals_stale",
      severity: "l2_warning",
      title: `${plural(input.overdueApprovalsOver48h, "approval", "approvals")} pending over 48h`,
      description: "Approvals have been waiting more than 48 hours — escalate.",
    })
  }

  if (input.openCriticalSafety > 0) {
    out.push({
      ruleKey: "safety_incident",
      severity: "l3_critical",
      title: `${plural(input.openCriticalSafety, "open critical safety incident", "open critical safety incidents")}`,
      description: "A critical-severity safety incident is open and unresolved.",
    })
  }

  if (input.stockoutRisk > 0) {
    out.push({
      ruleKey: "inventory_stockout",
      severity: "l3_critical",
      title: `${plural(input.stockoutRisk, "product", "products")} at stockout risk`,
      description: "Inventory has fallen to or below the reorder point — replenish now.",
    })
  }

  if (input.healthScore < HEALTH_FLOOR) {
    out.push({
      ruleKey: "health_critical",
      severity: "l3_critical",
      title: `Company health critical (${Math.round(input.healthScore)}/100)`,
      description: "Composite company health has fallen below 50 — intervention recommended.",
    })
  }

  return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}
