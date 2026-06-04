export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: AuthErrorCode,
    public readonly statusCode: number = 401
  ) {
    super(message)
    this.name = "AuthError"
  }
}

export type AuthErrorCode =
  | "SESSION_EXPIRED"
  | "SESSION_NOT_FOUND"
  | "SESSION_REVOKED"
  | "MFA_REQUIRED"
  | "MFA_FAILED"
  | "MFA_EXPIRED"
  | "INSUFFICIENT_SCOPE"
  | "INSUFFICIENT_ROLE"
  | "COMPANY_MISMATCH"
  | "DEVICE_UNTRUSTED"
  | "TOKEN_INVALID"
  | "TOKEN_EXPIRED"
  | "RATE_LIMITED"

export const AuthErrors = {
  sessionExpired: () => new AuthError("Session has expired", "SESSION_EXPIRED", 401),

  sessionNotFound: () => new AuthError("Session not found", "SESSION_NOT_FOUND", 401),

  sessionRevoked: () => new AuthError("Session has been revoked", "SESSION_REVOKED", 401),

  mfaRequired: () => new AuthError("MFA verification required", "MFA_REQUIRED", 403),

  mfaFailed: () => new AuthError("MFA verification failed", "MFA_FAILED", 401),

  insufficientScope: (required: string, actual: string) =>
    new AuthError(
      `Insufficient scope: required ${required}, got ${actual}`,
      "INSUFFICIENT_SCOPE",
      403
    ),

  insufficientRole: () =>
    new AuthError("Insufficient role for this action", "INSUFFICIENT_ROLE", 403),

  companyMismatch: () =>
    new AuthError("Resource belongs to a different company", "COMPANY_MISMATCH", 403),

  deviceUntrusted: () =>
    new AuthError("Device is not trusted for this account", "DEVICE_UNTRUSTED", 403),

  tokenInvalid: () => new AuthError("Token is invalid", "TOKEN_INVALID", 401),

  tokenExpired: () => new AuthError("Token has expired", "TOKEN_EXPIRED", 401),

  rateLimited: () => new AuthError("Too many requests", "RATE_LIMITED", 429),
} as const
