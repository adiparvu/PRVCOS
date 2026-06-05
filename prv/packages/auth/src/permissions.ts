import type { SystemRole, ScopeLevel, PRVSession } from "./types"
import { AuthErrors } from "./errors"

// ─── Scope ordering (higher = broader access) ─────────────────────────────

const SCOPE_ORDER: Record<ScopeLevel, number> = {
  SCOPE_RECORD: 1,
  SCOPE_TEAM: 2,
  SCOPE_DEPARTMENT: 3,
  SCOPE_STORE: 4,
  SCOPE_REGION: 5,
  SCOPE_COMPANY: 6,
  SCOPE_GROUP: 7,
  SCOPE_PLATFORM: 8,
  SCOPE_GLOBAL: 9,
}

export function hasScope(actual: ScopeLevel, required: ScopeLevel): boolean {
  return SCOPE_ORDER[actual] >= SCOPE_ORDER[required]
}

export function requireScope(session: PRVSession, required: ScopeLevel): void {
  if (!hasScope(session.scopeLevel, required)) {
    throw AuthErrors.insufficientScope(required, session.scopeLevel)
  }
}

// ─── Role sets ──────────────────────────────────────────────────────────────

const ADMIN_ROLES = new Set<SystemRole>(["group_ceo", "ceo", "co_ceo", "system_administrator"])

const MANAGEMENT_ROLES = new Set<SystemRole>([
  ...ADMIN_ROLES,
  "operations_manager",
  "department_head",
  "hr_payroll",
  "project_director",
  "shop_director",
])

const SUPERVISOR_ROLES = new Set<SystemRole>([
  ...MANAGEMENT_ROLES,
  "team_leader",
  "oms",
  "project_oms",
  "project_operations_manager",
  "store_manager",
])

const ANALYTICS_ROLES = new Set<SystemRole>([
  ...MANAGEMENT_ROLES,
  "data_analyst",
  "app_support_specialist",
  "qa_tester",
])

// Every authenticated employee — for self-service actions (own profile, presence, business card)
const ALL_EMPLOYEE_ROLES = new Set<SystemRole>([
  ...SUPERVISOR_ROLES,
  "worker",
  "project_worker",
  "project_team_leader",
  "seller",
])

export const RoleSets = {
  admin: ADMIN_ROLES,
  management: MANAGEMENT_ROLES,
  supervisor: SUPERVISOR_ROLES,
  analytics: ANALYTICS_ROLES,
  employee: ALL_EMPLOYEE_ROLES,
} as const

export function hasRole(role: SystemRole, set: Set<SystemRole>): boolean {
  return set.has(role)
}

export function requireRole(session: PRVSession, set: Set<SystemRole>): void {
  if (!hasRole(session.role, set)) {
    throw AuthErrors.insufficientRole()
  }
}

// ─── Company boundary enforcement ────────────────────────────────────────

export function requireSameCompany(session: PRVSession, resourceCompanyId: string): void {
  // Group-level and platform admins may cross company boundaries
  if (hasScope(session.scopeLevel, "SCOPE_GROUP")) return
  if (session.companyId !== resourceCompanyId) {
    throw AuthErrors.companyMismatch()
  }
}

// ─── Combined guard — most common use case ────────────────────────────────

export interface PermissionCheck {
  /** Minimum scope level required */
  scope?: ScopeLevel
  /** At least one role in this set */
  roles?: Set<SystemRole>
  /** Resource must belong to this company */
  resourceCompanyId?: string
}

export function checkPermission(session: PRVSession, check: PermissionCheck): void {
  if (check.scope) requireScope(session, check.scope)
  if (check.roles) requireRole(session, check.roles)
  if (check.resourceCompanyId) requireSameCompany(session, check.resourceCompanyId)
}

// ─── MFA gate ────────────────────────────────────────────────────────────

export function requireMfa(session: PRVSession): void {
  if (!session.mfaVerified) {
    throw AuthErrors.mfaRequired()
  }
}

/** Roles that always require MFA (regardless of security level config) */
const MFA_MANDATORY_ROLES = new Set<SystemRole>([
  "group_ceo",
  "ceo",
  "co_ceo",
  "system_administrator",
  "hr_payroll",
])

export function isMfaMandatory(role: SystemRole): boolean {
  return MFA_MANDATORY_ROLES.has(role)
}
