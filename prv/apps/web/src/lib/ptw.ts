// Phase 18.3 — Permit-to-Work (pure lifecycle logic).
//
// A permit moves through an explicit 8-state machine with a two-stage approval
// (supervisor → safety officer) modelled directly on the permit row — NOT via
// @prv/approval-engine, which is single-approver/terminal. All ordering and
// authorization rules live here so both the API guard and the UI (which buttons
// to show) share one contract; callers pass a resolved actor descriptor rather
// than raw roles, keeping authorization explicit.

export const PERMIT_TYPES = [
  "hot_work",
  "confined_space",
  "working_at_height",
  "electrical",
  "excavation",
] as const
export type PermitType = (typeof PERMIT_TYPES)[number]

export const PERMIT_STATUSES = [
  "draft",
  "pending_supervisor",
  "pending_safety_officer",
  "approved",
  "active",
  "closed",
  "rejected",
  "expired",
  "suspended",
  "revoked",
] as const
export type PermitStatus = (typeof PERMIT_STATUSES)[number]

export const PERMIT_ACTIONS = [
  "submit",
  "approve",
  "reject",
  "activate",
  "close",
  "suspend",
  "reinstate",
  "revoke",
] as const
export type PermitAction = (typeof PERMIT_ACTIONS)[number]

export function isPermitType(v: string): v is PermitType {
  return (PERMIT_TYPES as readonly string[]).includes(v)
}

// Required typeDetails keys per permit type. Presence (not domain-correctness) is
// gated at submit; richer LOTO/gas-monitoring rules are future work.
export const PERMIT_TYPE_REQUIRED_FIELDS: Record<PermitType, string[]> = {
  hot_work: ["fireWatch", "extinguisherPresent", "hotWorkEndsAt"],
  confined_space: ["gasTestO2", "gasTestLEL", "attendant", "rescuePlan"],
  working_at_height: ["fallProtection", "anchorPoints", "heightM"],
  electrical: ["isolationApplied", "voltage", "competentPerson"],
  excavation: ["excavationDepthM", "utilitiesChecked", "groundSupport"],
}

export function requiredFieldsForType(type: PermitType): string[] {
  return PERMIT_TYPE_REQUIRED_FIELDS[type] ?? []
}

// The state machine: from-status → action → to-status. Terminal states omitted.
export const TRANSITIONS: Record<PermitStatus, Partial<Record<PermitAction, PermitStatus>>> = {
  draft: { submit: "pending_supervisor" },
  pending_supervisor: { approve: "pending_safety_officer", reject: "rejected" },
  pending_safety_officer: { approve: "approved", reject: "rejected" },
  approved: { activate: "active" },
  active: { close: "closed", suspend: "suspended", revoke: "revoked" },
  suspended: { reinstate: "active", close: "closed", revoke: "revoked" },
  closed: {},
  rejected: {},
  expired: {},
  revoked: {},
}

export interface TransitionResult {
  ok: boolean
  to?: PermitStatus
  reason?: string
}

// Whether `action` is a legal move from `from`, and the resulting state.
export function canTransition(from: PermitStatus, action: PermitAction): TransitionResult {
  const to = TRANSITIONS[from]?.[action]
  if (!to) return { ok: false, reason: `Cannot ${action} a permit in state ${from}` }
  return { ok: true, to }
}

export interface PermitActor {
  isRequester: boolean
  isSupervisor: boolean
  isSafetyOfficer: boolean
  isAdmin: boolean
}

// Who may perform `action` given the permit's current `from` state. Admins may
// act at any stage; each approval stage is reserved to its assigned approver.
export function canAct(from: PermitStatus, action: PermitAction, actor: PermitActor): boolean {
  if (actor.isAdmin) return TRANSITIONS[from]?.[action] !== undefined
  switch (action) {
    case "submit":
      return from === "draft" && actor.isRequester
    case "approve":
    case "reject":
      if (from === "pending_supervisor") return actor.isSupervisor
      if (from === "pending_safety_officer") return actor.isSafetyOfficer
      return false
    case "activate":
      return from === "approved" && (actor.isRequester || actor.isSupervisor)
    case "close":
      return (
        (from === "active" || from === "suspended") &&
        (actor.isRequester || actor.isSupervisor || actor.isSafetyOfficer)
      )
    case "suspend":
      // Stop-work authority is broad: anyone on the permit may halt active work.
      return from === "active" && (actor.isRequester || actor.isSupervisor || actor.isSafetyOfficer)
    case "reinstate":
      // Re-authorizing paused work needs an approver, not the requester alone.
      return from === "suspended" && (actor.isSupervisor || actor.isSafetyOfficer)
    case "revoke":
      return (
        (from === "active" || from === "suspended") && (actor.isSupervisor || actor.isSafetyOfficer)
      )
    default:
      return false
  }
}

// Actions the given actor may take from `status` — drives the detail UI buttons.
export function allowedActions(status: PermitStatus, actor: PermitActor): PermitAction[] {
  const fromMap = TRANSITIONS[status]
  if (!fromMap) return []
  return (Object.keys(fromMap) as PermitAction[]).filter((a) => canAct(status, a, actor))
}

export interface SubmitInput {
  type: PermitType
  validFromMs: number
  validToMs: number
  riskAssessment: unknown[]
  typeDetails: Record<string, unknown>
}

function isPresent(v: unknown): boolean {
  return v !== undefined && v !== null && v !== ""
}

// Gate a permit before submit: at least one risk-assessment row, a coherent
// validity window, and every required typeDetails field for its type present.
// Returns an array of human error strings ([] = ok), mirroring the approval-engine
// validate shape.
export function validatePermitForSubmit(input: SubmitInput): string[] {
  const errors: string[] = []
  if (!Array.isArray(input.riskAssessment) || input.riskAssessment.length < 1)
    errors.push("Evaluarea de risc necesită cel puțin o intrare")
  if (!(input.validFromMs < input.validToMs))
    errors.push("Valabil de la trebuie să fie înainte de valabil până la")
  const details = input.typeDetails ?? {}
  for (const field of requiredFieldsForType(input.type)) {
    if (!isPresent(details[field])) errors.push(`Câmp obligatoriu lipsă: ${field}`)
  }
  return errors
}

// Inclusive validity-window check.
export function isWithinValidity(validFromMs: number, validToMs: number, nowMs: number): boolean {
  return nowMs >= validFromMs && nowMs <= validToMs
}

// The status to display: an approved/active permit past its valid_to reads as
// expired even before a sweep job flips the stored value. Other states pass
// through unchanged.
export function effectivePermitStatus(
  status: PermitStatus,
  validToMs: number,
  nowMs: number
): PermitStatus {
  if ((status === "approved" || status === "active") && validToMs < nowMs) return "expired"
  return status
}

export function isPermitStatus(v: string): v is PermitStatus {
  return (PERMIT_STATUSES as readonly string[]).includes(v)
}

// Actions that move a permit FORWARD through the lifecycle. These are blocked once
// the validity window has passed; reject and close (close-out) remain allowed so an
// expired permit can still be legitimately terminated.
export const FORWARD_ACTIONS: PermitAction[] = ["submit", "approve", "activate", "reinstate"]

export function isExpiredWindow(validToMs: number, nowMs: number): boolean {
  return validToMs < nowMs
}

// Actions the actor may take, additionally suppressing forward progress once the
// validity window has elapsed — keeps the buttons and the transition guard in sync
// with the displayed effective (expired) status.
export function allowedActionsForValidity(
  status: PermitStatus,
  actor: PermitActor,
  validToMs: number,
  nowMs: number
): PermitAction[] {
  const acts = allowedActions(status, actor)
  if (!isExpiredWindow(validToMs, nowMs)) return acts
  return acts.filter((a) => !FORWARD_ACTIONS.includes(a))
}

// Separation-of-duties gate enforced at submit: both approvers must be assigned,
// distinct from the requester, and distinct from each other. Without this a single
// user could assign themselves both stages and self-approve end-to-end.
export function approverSeparationErrors(
  requestedBy: string,
  supervisorId: string | null,
  safetyOfficerId: string | null
): string[] {
  const errors: string[] = []
  if (!supervisorId) errors.push("Trebuie asignat un supervizor")
  if (!safetyOfficerId) errors.push("Trebuie asignat un responsabil SSM/PSI")
  if (supervisorId && supervisorId === requestedBy)
    errors.push("Supervizorul nu poate fi solicitantul")
  if (safetyOfficerId && safetyOfficerId === requestedBy)
    errors.push("Responsabilul SSM/PSI nu poate fi solicitantul")
  if (supervisorId && safetyOfficerId && supervisorId === safetyOfficerId)
    errors.push("Cei doi aprobatori trebuie să fie persoane diferite")
  return errors
}

export interface PermitParties {
  title: string
  requestedBy: string
  supervisorId: string | null
  safetyOfficerId: string | null
}

export interface PermitNotice {
  userId: string
  title: string
}

// Who to notify after a stage change, and with what headline. Recipients that are
// null are skipped; the acting user is de-duplicated by the caller. Uses toStatus to
// disambiguate the two approve stages.
export function permitNotificationRecipients(
  action: PermitAction,
  toStatus: PermitStatus,
  permit: PermitParties
): PermitNotice[] {
  const push = (userId: string | null, title: string): PermitNotice[] =>
    userId ? [{ userId, title }] : []
  const t = permit.title
  switch (action) {
    case "submit":
      return push(permit.supervisorId, `Permis de aprobat: ${t}`)
    case "approve":
      return toStatus === "pending_safety_officer"
        ? push(permit.safetyOfficerId, `Permis de aprobat (SSM/PSI): ${t}`)
        : push(permit.requestedBy, `Permis aprobat: ${t}`)
    case "reject":
      return push(permit.requestedBy, `Permis respins: ${t}`)
    case "activate":
      return [
        ...push(permit.supervisorId, `Permis activat: ${t}`),
        ...push(permit.safetyOfficerId, `Permis activat: ${t}`),
      ]
    case "close":
      return [
        ...push(permit.supervisorId, `Permis închis: ${t}`),
        ...push(permit.safetyOfficerId, `Permis închis: ${t}`),
      ]
    case "suspend":
      return [
        ...push(permit.requestedBy, `Permis suspendat: ${t}`),
        ...push(permit.safetyOfficerId, `Permis suspendat: ${t}`),
      ]
    case "reinstate":
      return push(permit.requestedBy, `Permis reluat: ${t}`)
    case "revoke":
      return push(permit.requestedBy, `Permis revocat: ${t}`)
    default:
      return []
  }
}

// ── Permit approver designations (safe-variant Safety Officer model) ──────────
// "Safety Officer" / "Supervisor" are per-company DESIGNATIONS (a managed list),
// not global roles. The permit stores an assigned approver per stage; at action
// time we additionally require the acting user to still HOLD the matching
// designation (or be an elevated admin), so a revoked designation immediately
// removes approval power even on an already-assigned permit.

export const PERMIT_DESIGNATION_ROLES = ["supervisor", "safety_officer"] as const
export type PermitDesignationRole = (typeof PERMIT_DESIGNATION_ROLES)[number]

export function isDesignationRole(v: string): v is PermitDesignationRole {
  return (PERMIT_DESIGNATION_ROLES as readonly string[]).includes(v)
}

export interface ResolveActorInput {
  userId: string
  isAdmin: boolean
  requestedBy: string
  supervisorId: string | null
  safetyOfficerId: string | null
  designations: PermitDesignationRole[]
}

// Build the PermitActor with the designation tightening applied. A user is treated
// as this permit's supervisor/safety-officer only when they are BOTH the assigned
// approver AND currently designated for that role (admins bypass the designation
// requirement, matching canAct's admin fallback).
export function resolvePermitActor(input: ResolveActorInput): PermitActor {
  const has = (r: PermitDesignationRole): boolean => input.isAdmin || input.designations.includes(r)
  return {
    isRequester: input.requestedBy === input.userId,
    isSupervisor: input.supervisorId === input.userId && has("supervisor"),
    isSafetyOfficer: input.safetyOfficerId === input.userId && has("safety_officer"),
    isAdmin: input.isAdmin,
  }
}
