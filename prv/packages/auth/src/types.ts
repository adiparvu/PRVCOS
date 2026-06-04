import type { SecurityLevel } from "@prv/cache"

// ─── Role system (mirrors ROLE_ARCHITECTURE.md) ────────────────────────────

export type SystemRole =
  // Core
  | "group_ceo"
  | "ceo"
  | "co_ceo"
  | "system_administrator"
  // Attendance
  | "worker"
  | "team_leader"
  | "oms"
  | "operations_manager"
  | "department_head"
  | "hr_payroll"
  // Projects
  | "project_worker"
  | "project_team_leader"
  | "project_oms"
  | "project_operations_manager"
  | "project_director"
  // Shop
  | "seller"
  | "store_manager"
  | "shop_director"
  // Analytics
  | "app_support_specialist"
  | "data_analyst"
  | "qa_tester"

// ─── Scope levels (mirrors ROLE_ARCHITECTURE.md §Scope) ────────────────────

export type ScopeLevel =
  | "SCOPE_RECORD" // 1 — own record only
  | "SCOPE_TEAM" // 2 — own team
  | "SCOPE_DEPARTMENT" // 3 — own department
  | "SCOPE_STORE" // 4 — assigned store(s)
  | "SCOPE_REGION" // 5 — assigned region
  | "SCOPE_COMPANY" // 6 — entire company
  | "SCOPE_GROUP" // 7 — all companies in group
  | "SCOPE_PLATFORM" // 8 — platform-level (sysadmin)
  | "SCOPE_GLOBAL" // 9 — unrestricted

// ─── Session ───────────────────────────────────────────────────────────────

export interface PRVSession {
  sessionId: string
  userId: string
  companyId: string
  role: SystemRole
  scopeLevel: ScopeLevel
  securityLevel: SecurityLevel
  mfaVerified: boolean
  deviceId: string
  createdAt: number // unix timestamp
  expiresAt: number // unix timestamp
  lastActiveAt: number
}

// ─── User identity (subset returned to consumers) ─────────────────────────

export interface PRVUser {
  id: string
  companyId: string
  role: SystemRole
  scopeLevel: ScopeLevel
  securityLevel: SecurityLevel
  mfaEnabled: boolean
}

// ─── MFA ───────────────────────────────────────────────────────────────────

export type MFAMethod = "totp" | "sms" | "email_otp" | "passkey"

export interface MFAChallenge {
  challengeId: string
  method: MFAMethod
  expiresAt: number
}

// ─── Device registry ───────────────────────────────────────────────────────

export interface DeviceFingerprint {
  deviceId: string
  userId: string
  userAgent: string
  trusted: boolean
  lastSeenAt: number
}
