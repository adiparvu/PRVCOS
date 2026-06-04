import { db } from "@prv/db"
import { securityEvents } from "@prv/db"

export type SecurityEventType =
  | "auth_failure"
  | "mfa_failure"
  | "mfa_required"
  | "session_expired"
  | "insufficient_scope"
  | "insufficient_role"
  | "company_mismatch"
  | "rate_limit_exceeded"
  | "dlp_triggered"
  | "privilege_escalation"
  | "account_locked"
  | "device_untrusted"
  | "reauth_required"

export type SecurityEventSeverity = "low" | "medium" | "high" | "critical"

export interface SecurityEventInput {
  companyId?: string
  actorId?: string
  eventType: SecurityEventType
  severity: SecurityEventSeverity
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  path?: string
  sessionId?: string
}

export async function logSecurityEvent(event: SecurityEventInput): Promise<void> {
  await db.insert(securityEvents).values({
    companyId: event.companyId,
    actorId: event.actorId,
    eventType: event.eventType,
    severity: event.severity,
    metadata: event.metadata ?? null,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    path: event.path,
    sessionId: event.sessionId,
  })
}
