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
