export type {
  SystemRole,
  ScopeLevel,
  PRVSession,
  PRVUser,
  MFAMethod,
  MFAChallenge,
  DeviceFingerprint,
} from "./types"

export { AuthError, AuthErrors } from "./errors"
export type { AuthErrorCode } from "./errors"

export {
  getSession,
  createSession,
  revokeSession,
  revokeAllUserSessions,
  refreshSession,
} from "./session"

export {
  hasScope,
  requireScope,
  hasRole,
  requireRole,
  requireSameCompany,
  checkPermission,
  requireMfa,
  isMfaMandatory,
  RoleSets,
} from "./permissions"
export type { PermissionCheck } from "./permissions"

export { writeAuditLog, computeEntryHash, sha256hex } from "./audit"
export type { AuditEntry } from "./audit"

export { logSecurityEvent } from "./security-events"
export type {
  SecurityEventInput,
  SecurityEventType,
  SecurityEventSeverity,
} from "./security-events"

export { confirmReauth, checkReauth, revokeReauth } from "./re-auth"

export { runGateChain, withGates } from "./gate-chain"
export type { RouteConfig, GateContext } from "./gate-chain"
