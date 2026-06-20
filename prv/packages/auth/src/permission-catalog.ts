import type { ScopeLevel, SystemRole, PRVSession } from "./types"
import { RoleSets, hasScope, hasRole } from "./permissions"
import { AuthErrors } from "./errors"

// ─── Permission Catalog (P-04) ─────────────────────────────────────────────
// Every granular action in PRV is listed here.
// Each entry defines the minimum role set and minimum scope required.
// This is the single source of truth for per-action authorization.

export interface PermissionRule {
  /** At least one role from this set is required */
  roles: Set<SystemRole>
  /** Minimum scope level required */
  scope: ScopeLevel
}

type PermissionKey =
  // ── Employees ──
  | "employees.read"
  | "employees.create"
  | "employees.update"
  | "employees.delete"
  | "employees.suspend"
  | "employees.export"
  // ── Clients / CRM ──
  | "clients.read"
  | "clients.create"
  | "clients.update"
  | "clients.delete"
  // ── Suppliers ──
  | "suppliers.read"
  | "suppliers.create"
  | "suppliers.update"
  | "suppliers.delete"
  // ── Projects ──
  | "projects.read"
  | "projects.create"
  | "projects.update"
  | "projects.delete"
  | "projects.archive"
  // ── Products ──
  | "products.read"
  | "products.create"
  | "products.update"
  | "products.delete"
  // ── Orders ──
  | "orders.read"
  | "orders.create"
  | "orders.update"
  | "orders.cancel"
  // ── Invoices ──
  | "invoices.read"
  | "invoices.create"
  | "invoices.update"
  | "invoices.delete"
  | "invoices.send"
  // ── Documents ──
  | "documents.read"
  | "documents.create"
  | "documents.update"
  | "documents.delete"
  | "documents.sign"
  // ── Fleet / Vehicles ──
  | "fleet.read"
  | "fleet.create"
  | "fleet.update"
  | "fleet.assign"
  // ── Tools ──
  | "tools.read"
  | "tools.create"
  | "tools.update"
  | "tools.assign"
  // ── Teams ──
  | "teams.read"
  | "teams.create"
  | "teams.update"
  | "teams.delete"
  // ── Companies ──
  | "companies.read"
  | "companies.update"
  | "companies.suspend"
  // ── Roles / Permissions ──
  | "roles.read"
  | "roles.assign"
  // ── Analytics ──
  | "analytics.read"
  | "analytics.export"
  // ── Alerts ──
  | "alerts.read"
  | "alerts.update"
  | "alerts.assign"
  // ── Social Profiles ──
  | "social_profiles.view"
  | "social_profiles.edit_own"
  | "social_profiles.edit_others"
  | "social_profiles.delete_own"
  | "social_profiles.delete_others"
  // ── Presence ──
  | "presence.view_team"
  | "presence.view_company"
  | "presence.set_manual"
  | "presence.override_others"
  // ── Digital Business Cards ──
  | "business_card.view_own"
  | "business_card.view_others"
  | "business_card.share"
  | "business_card.public_link"
  // ── Data Export (GDPR) ──
  | "data_export.gdpr"
  // ── Settings ──
  | "settings.company.read"
  | "settings.company.update"
  | "settings.security.read"
  | "settings.security.update"

export const PERMISSION_CATALOG: Record<PermissionKey, PermissionRule> = {
  // Employees
  "employees.read": { roles: RoleSets.supervisor, scope: "SCOPE_TEAM" },
  "employees.create": { roles: RoleSets.management, scope: "SCOPE_DEPARTMENT" },
  "employees.update": { roles: RoleSets.management, scope: "SCOPE_DEPARTMENT" },
  "employees.delete": { roles: RoleSets.admin, scope: "SCOPE_COMPANY" },
  "employees.suspend": { roles: RoleSets.management, scope: "SCOPE_DEPARTMENT" },
  "employees.export": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },

  // Clients / CRM
  "clients.read": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "clients.create": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "clients.update": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "clients.delete": { roles: RoleSets.admin, scope: "SCOPE_COMPANY" },

  // Suppliers
  "suppliers.read": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "suppliers.create": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "suppliers.update": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "suppliers.delete": { roles: RoleSets.admin, scope: "SCOPE_COMPANY" },

  // Projects
  "projects.read": { roles: RoleSets.supervisor, scope: "SCOPE_TEAM" },
  "projects.create": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "projects.update": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "projects.delete": { roles: RoleSets.admin, scope: "SCOPE_COMPANY" },
  "projects.archive": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },

  // Products
  "products.read": { roles: RoleSets.supervisor, scope: "SCOPE_STORE" },
  "products.create": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "products.update": { roles: RoleSets.management, scope: "SCOPE_STORE" },
  "products.delete": { roles: RoleSets.admin, scope: "SCOPE_COMPANY" },

  // Orders
  "orders.read": { roles: RoleSets.supervisor, scope: "SCOPE_STORE" },
  "orders.create": { roles: RoleSets.supervisor, scope: "SCOPE_STORE" },
  "orders.update": { roles: RoleSets.supervisor, scope: "SCOPE_STORE" },
  "orders.cancel": { roles: RoleSets.management, scope: "SCOPE_STORE" },

  // Invoices
  "invoices.read": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "invoices.create": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "invoices.update": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "invoices.delete": { roles: RoleSets.admin, scope: "SCOPE_COMPANY" },
  "invoices.send": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },

  // Documents
  "documents.read": { roles: RoleSets.supervisor, scope: "SCOPE_TEAM" },
  "documents.create": { roles: RoleSets.supervisor, scope: "SCOPE_TEAM" },
  "documents.update": { roles: RoleSets.supervisor, scope: "SCOPE_TEAM" },
  "documents.delete": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "documents.sign": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },

  // Fleet
  "fleet.read": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "fleet.create": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "fleet.update": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "fleet.assign": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },

  // Tools
  "tools.read": { roles: RoleSets.supervisor, scope: "SCOPE_TEAM" },
  "tools.create": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "tools.update": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "tools.assign": { roles: RoleSets.supervisor, scope: "SCOPE_TEAM" },

  // Teams
  "teams.read": { roles: RoleSets.supervisor, scope: "SCOPE_TEAM" },
  "teams.create": { roles: RoleSets.management, scope: "SCOPE_DEPARTMENT" },
  "teams.update": { roles: RoleSets.management, scope: "SCOPE_DEPARTMENT" },
  "teams.delete": { roles: RoleSets.admin, scope: "SCOPE_COMPANY" },

  // Companies
  "companies.read": { roles: RoleSets.admin, scope: "SCOPE_GROUP" },
  "companies.update": { roles: RoleSets.admin, scope: "SCOPE_GROUP" },
  "companies.suspend": { roles: RoleSets.admin, scope: "SCOPE_PLATFORM" },

  // Roles
  "roles.read": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "roles.assign": { roles: RoleSets.admin, scope: "SCOPE_COMPANY" },

  // Analytics
  "analytics.read": { roles: RoleSets.analytics, scope: "SCOPE_COMPANY" },
  "analytics.export": { roles: RoleSets.analytics, scope: "SCOPE_COMPANY" },

  // Alerts
  "alerts.read": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "alerts.update": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "alerts.assign": { roles: RoleSets.admin, scope: "SCOPE_COMPANY" },

  // Social profiles
  "social_profiles.view": { roles: RoleSets.employee, scope: "SCOPE_TEAM" },
  "social_profiles.edit_own": { roles: RoleSets.employee, scope: "SCOPE_RECORD" },
  "social_profiles.edit_others": { roles: RoleSets.management, scope: "SCOPE_DEPARTMENT" },
  "social_profiles.delete_own": { roles: RoleSets.employee, scope: "SCOPE_RECORD" },
  "social_profiles.delete_others": { roles: RoleSets.management, scope: "SCOPE_DEPARTMENT" },

  // Presence
  "presence.view_team": { roles: RoleSets.employee, scope: "SCOPE_TEAM" },
  "presence.view_company": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "presence.set_manual": { roles: RoleSets.employee, scope: "SCOPE_RECORD" },
  "presence.override_others": { roles: RoleSets.management, scope: "SCOPE_DEPARTMENT" },

  // Business cards
  "business_card.view_own": { roles: RoleSets.employee, scope: "SCOPE_RECORD" },
  "business_card.view_others": { roles: RoleSets.employee, scope: "SCOPE_TEAM" },
  "business_card.share": { roles: RoleSets.employee, scope: "SCOPE_RECORD" },
  "business_card.public_link": { roles: RoleSets.management, scope: "SCOPE_RECORD" },

  // GDPR
  "data_export.gdpr": { roles: RoleSets.admin, scope: "SCOPE_COMPANY" },

  // Settings
  "settings.company.read": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "settings.company.update": { roles: RoleSets.admin, scope: "SCOPE_COMPANY" },
  "settings.security.read": { roles: RoleSets.management, scope: "SCOPE_COMPANY" },
  "settings.security.update": { roles: RoleSets.admin, scope: "SCOPE_COMPANY" },
}

// ─── Public API ────────────────────────────────────────────────────────────

export function hasPermission(session: PRVSession, key: PermissionKey): boolean {
  const rule = PERMISSION_CATALOG[key]
  if (!rule) return false
  return hasRole(session.role, rule.roles) && hasScope(session.scopeLevel, rule.scope)
}

export function requirePermission(session: PRVSession, key: PermissionKey): void {
  if (!hasPermission(session, key)) {
    throw AuthErrors.insufficientRole()
  }
}

export type { PermissionKey }
