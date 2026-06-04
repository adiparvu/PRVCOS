import { getSession } from "./session"
import { isMfaMandatory, requireMfa, checkPermission } from "./permissions"
import { checkRateLimit } from "@prv/cache"
import { writeAuditLog } from "./audit"
import { logSecurityEvent } from "./security-events"
import { checkReauth } from "./re-auth"
import { AuthError, AuthErrors } from "./errors"
import type { PRVSession, ScopeLevel, SystemRole } from "./types"
import type { RateLimitEndpointClass } from "@prv/cache"

export interface RouteConfig {
  action: string
  endpointClass: RateLimitEndpointClass
  requiredScope?: ScopeLevel
  requiredRoles?: Set<SystemRole>
  requireMfa?: boolean
  requireReauth?: boolean
  entityType?: string
  entityId?: string
  dlp?: boolean
}

export interface GateContext {
  session: PRVSession
  requestId: string
  ipAddress: string
  userAgent: string
  path: string
  method: string
}

const PRV_SESSION_COOKIE = "prv_session"

// 1MB — payloads larger than this are flagged by DLP
const DLP_SIZE_LIMIT = 1_048_576

const DLP_PATTERNS = [
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // credit card
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
]

function extractIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

function extractSessionId(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? ""
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=")
    if (name === PRV_SESSION_COOKIE) return rest.join("=")
  }
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)
  return null
}

async function scanDlp(req: Request): Promise<boolean> {
  const size = Number(req.headers.get("content-length") ?? 0)
  if (size > DLP_SIZE_LIMIT) return true
  const ct = req.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) return false
  try {
    const text = await req.clone().text()
    return DLP_PATTERNS.some((p) => p.test(text))
  } catch {
    return false
  }
}

function fireAndForget(p: Promise<unknown>): void {
  p.catch(() => undefined)
}

export async function runGateChain(req: Request, config: RouteConfig): Promise<GateContext> {
  const url = new URL(req.url)
  const path = url.pathname
  const method = req.method
  const ipAddress = extractIp(req)
  const userAgent = req.headers.get("user-agent") ?? ""
  const requestId = crypto.randomUUID()

  let session: PRVSession | undefined
  let gateFailed = 0
  let errorCode: string | undefined

  try {
    // Gate 1 — Identity
    gateFailed = 1
    const sessionId = extractSessionId(req)
    if (!sessionId) throw AuthErrors.sessionNotFound()
    session = await getSession(sessionId)

    // Gate 2 — MFA
    gateFailed = 2
    if (config.requireMfa || isMfaMandatory(session.role)) requireMfa(session)

    // Gate 3 — Role load (role is on the session; validate it is present)
    gateFailed = 3
    if (!session.role) throw AuthErrors.insufficientRole()

    // Gate 4 — Permission
    gateFailed = 4
    if (config.requiredRoles) checkPermission(session, { roles: config.requiredRoles })

    // Gate 5 — Scope
    gateFailed = 5
    if (config.requiredScope) checkPermission(session, { scope: config.requiredScope })

    // Gate 6 — Company isolation
    gateFailed = 6
    if (!session.companyId) throw AuthErrors.companyMismatch()

    // Gate 7 — Rate limit
    gateFailed = 7
    const rl = await checkRateLimit(config.endpointClass, `${session.userId}:${path}`)
    if (!rl.success) {
      fireAndForget(
        logSecurityEvent({
          companyId: session.companyId,
          actorId: session.userId,
          eventType: "rate_limit_exceeded",
          severity: "medium",
          metadata: { endpoint: path, limit: rl.limit },
          ipAddress,
          userAgent,
          path,
          sessionId: session.sessionId,
        })
      )
      throw AuthErrors.rateLimited()
    }

    // Gate 8 — DLP
    gateFailed = 8
    if (config.dlp && (await scanDlp(req))) {
      fireAndForget(
        logSecurityEvent({
          companyId: session.companyId,
          actorId: session.userId,
          eventType: "dlp_triggered",
          severity: "high",
          metadata: { path, method },
          ipAddress,
          userAgent,
          path,
          sessionId: session.sessionId,
        })
      )
      throw new AuthError("Request blocked by content policy", "TOKEN_INVALID", 400)
    }

    // Gate 9 — Re-auth
    gateFailed = 9
    if (config.requireReauth) await checkReauth(session.sessionId)

    // All gates passed
    gateFailed = 0

    fireAndForget(
      writeAuditLog({
        companyId: session.companyId,
        actorId: session.userId,
        sessionId: session.sessionId,
        action: config.action,
        entityType: config.entityType,
        entityId: config.entityId,
        method,
        path,
        ipAddress,
        userAgent,
        gateFailed: 0,
      })
    )

    return { session, requestId, ipAddress, userAgent, path, method }
  } catch (err) {
    if (err instanceof AuthError) {
      errorCode = err.code

      const securityEventMap: Partial<
        Record<string, import("./security-events").SecurityEventType>
      > = {
        MFA_REQUIRED: "mfa_required",
        MFA_FAILED: "mfa_failure",
        INSUFFICIENT_SCOPE: "insufficient_scope",
        INSUFFICIENT_ROLE: "insufficient_role",
        COMPANY_MISMATCH: "company_mismatch",
        SESSION_EXPIRED: "session_expired",
        DEVICE_UNTRUSTED: "device_untrusted",
        REAUTH_REQUIRED: "reauth_required",
      }

      const eventType = securityEventMap[err.code]
      if (session && eventType) {
        fireAndForget(
          logSecurityEvent({
            companyId: session.companyId,
            actorId: session.userId,
            eventType,
            severity: gateFailed <= 2 ? "high" : "medium",
            metadata: { gate: gateFailed, code: err.code },
            ipAddress,
            userAgent,
            path,
            sessionId: session.sessionId,
          })
        )
      }

      if (session) {
        fireAndForget(
          writeAuditLog({
            companyId: session.companyId,
            actorId: session.userId,
            sessionId: session.sessionId,
            action: config.action,
            entityType: config.entityType,
            entityId: config.entityId,
            method,
            path,
            ipAddress,
            userAgent,
            gateFailed,
            errorCode,
          })
        )
      }

      throw err
    }
    throw err
  }
}

export function withGates(
  config: RouteConfig,
  handler: (req: Request, ctx: GateContext) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      const ctx = await runGateChain(req, config)
      return await handler(req, ctx)
    } catch (err) {
      if (err instanceof AuthError) {
        return Response.json({ error: err.message, code: err.code }, { status: err.statusCode })
      }
      return Response.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}
