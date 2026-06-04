import { describe, it, expect, vi, beforeEach } from "vitest"
import type { PRVSession } from "../types"

// Mock heavy dependencies — gate-chain is tested at unit level
vi.mock("../session", () => ({
  getSession: vi.fn(),
}))
vi.mock("@prv/cache", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 99, limit: 100, reset: 0 }),
  getRedis: vi.fn(),
}))
vi.mock("../audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("../security-events", () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("../re-auth", () => ({
  checkReauth: vi.fn().mockResolvedValue(undefined),
}))

import { runGateChain, withGates } from "../gate-chain"
import { getSession } from "../session"
import { checkRateLimit } from "@prv/cache"
import { AuthError, AuthErrors } from "../errors"
import type { RouteConfig } from "../gate-chain"

const mockGetSession = vi.mocked(getSession)
const mockCheckRateLimit = vi.mocked(checkRateLimit)

function makeSession(overrides: Partial<PRVSession> = {}): PRVSession {
  return {
    sessionId: "sess-1",
    userId: "usr-1",
    companyId: "cmp-1",
    role: "worker",
    scopeLevel: "SCOPE_RECORD",
    securityLevel: "L2",
    mfaVerified: false,
    deviceId: "dev-1",
    createdAt: Math.floor(Date.now() / 1000),
    expiresAt: Math.floor(Date.now() / 1000) + 28800,
    lastActiveAt: Math.floor(Date.now() / 1000),
    ...overrides,
  }
}

function makeRequest(overrides: { cookie?: string; auth?: string } = {}): Request {
  const headers: Record<string, string> = {
    "user-agent": "test-agent",
  }
  if (overrides.cookie) headers["cookie"] = overrides.cookie
  if (overrides.auth) headers["authorization"] = overrides.auth
  return new Request("http://localhost/api/test", { headers })
}

const baseConfig: RouteConfig = {
  action: "test.action",
  endpointClass: "api_read",
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 99, limit: 100, reset: 0 })
})

describe("runGateChain — gate 1 (identity)", () => {
  it("throws SESSION_NOT_FOUND when no session cookie or header", async () => {
    const req = makeRequest()
    await expect(runGateChain(req, baseConfig)).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
    })
  })

  it("throws when getSession throws SESSION_EXPIRED", async () => {
    mockGetSession.mockRejectedValueOnce(AuthErrors.sessionExpired())
    const req = makeRequest({ cookie: "prv_session=sess-1" })
    await expect(runGateChain(req, baseConfig)).rejects.toMatchObject({
      code: "SESSION_EXPIRED",
    })
  })

  it("passes gate 1 when session is valid", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession())
    const req = makeRequest({ cookie: "prv_session=sess-1" })
    const ctx = await runGateChain(req, baseConfig)
    expect(ctx.session.sessionId).toBe("sess-1")
  })

  it("extracts session id from Authorization Bearer header", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession())
    const req = makeRequest({ auth: "Bearer sess-abc" })
    await runGateChain(req, baseConfig)
    expect(mockGetSession).toHaveBeenCalledWith("sess-abc")
  })
})

describe("runGateChain — gate 2 (MFA)", () => {
  it("throws MFA_REQUIRED for mandatory role without MFA verified", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession({ role: "ceo", mfaVerified: false }))
    const req = makeRequest({ cookie: "prv_session=sess-1" })
    await expect(runGateChain(req, baseConfig)).rejects.toMatchObject({
      code: "MFA_REQUIRED",
    })
  })

  it("passes when MFA is verified for mandatory role", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession({ role: "ceo", mfaVerified: true }))
    const req = makeRequest({ cookie: "prv_session=sess-1" })
    const ctx = await runGateChain(req, baseConfig)
    expect(ctx.session.role).toBe("ceo")
  })

  it("throws MFA_REQUIRED when config.requireMfa and not verified", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession({ mfaVerified: false }))
    const req = makeRequest({ cookie: "prv_session=sess-1" })
    await expect(runGateChain(req, { ...baseConfig, requireMfa: true })).rejects.toMatchObject({
      code: "MFA_REQUIRED",
    })
  })
})

describe("runGateChain — gate 4 (permission)", () => {
  it("throws INSUFFICIENT_ROLE when role not in required set", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession({ role: "worker" }))
    const req = makeRequest({ cookie: "prv_session=sess-1" })
    const { RoleSets } = await import("../permissions")
    await expect(
      runGateChain(req, { ...baseConfig, requiredRoles: RoleSets.admin })
    ).rejects.toMatchObject({ code: "INSUFFICIENT_ROLE" })
  })
})

describe("runGateChain — gate 5 (scope)", () => {
  it("throws INSUFFICIENT_SCOPE when scope is too low", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession({ scopeLevel: "SCOPE_RECORD" }))
    const req = makeRequest({ cookie: "prv_session=sess-1" })
    await expect(
      runGateChain(req, { ...baseConfig, requiredScope: "SCOPE_COMPANY" })
    ).rejects.toMatchObject({ code: "INSUFFICIENT_SCOPE" })
  })
})

describe("runGateChain — gate 7 (rate limit)", () => {
  it("throws RATE_LIMITED when limiter returns success=false", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession())
    mockCheckRateLimit.mockResolvedValueOnce({ success: false, remaining: 0, limit: 10, reset: 0 })
    const req = makeRequest({ cookie: "prv_session=sess-1" })
    await expect(runGateChain(req, baseConfig)).rejects.toMatchObject({
      code: "RATE_LIMITED",
    })
  })
})

describe("runGateChain — success", () => {
  it("returns GateContext with session and metadata", async () => {
    const session = makeSession({ role: "worker", mfaVerified: false })
    mockGetSession.mockResolvedValueOnce(session)
    const req = makeRequest({ cookie: "prv_session=sess-1" })
    const ctx = await runGateChain(req, baseConfig)
    expect(ctx.session).toEqual(session)
    expect(ctx.requestId).toHaveLength(36) // UUID
    expect(ctx.method).toBe("GET")
    expect(ctx.path).toBe("/api/test")
  })
})

describe("withGates", () => {
  it("returns 401 JSON on SESSION_NOT_FOUND", async () => {
    const handler = vi.fn()
    const wrapped = withGates(baseConfig, handler)
    const req = makeRequest()
    const res = await wrapped(req)
    expect(res.status).toBe(401)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe("SESSION_NOT_FOUND")
    expect(handler).not.toHaveBeenCalled()
  })

  it("calls handler with ctx on success", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession())
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }))
    const wrapped = withGates(baseConfig, handler)
    const req = makeRequest({ cookie: "prv_session=sess-1" })
    const res = await wrapped(req)
    expect(handler).toHaveBeenCalledOnce()
    expect(res.status).toBe(200)
  })
})
