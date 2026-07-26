import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextResponse } from "next/server"

const getSessionMock = vi.fn()
const refreshSessionMock = vi.fn()
vi.mock("@prv/auth", () => ({
  getSession: (...a: unknown[]) => getSessionMock(...a),
  refreshSession: (...a: unknown[]) => refreshSessionMock(...a),
}))

const checkRateLimitMock = vi.fn()
vi.mock("@prv/cache", () => ({
  checkRateLimit: (...a: unknown[]) => checkRateLimitMock(...a),
}))

const getPortalSessionMock = vi.fn()
vi.mock("@/lib/portal-auth", () => ({
  getPortalSession: (...a: unknown[]) => getPortalSessionMock(...a),
}))

const SESSION = {
  sessionId: "s1",
  userId: "user-1",
  companyId: "company-1",
  role: "store_manager",
  scopeLevel: "store",
}

const PORTAL_SESSION = {
  sessionId: "ps1",
  accountId: "acct-1",
  companyId: "company-1",
  portalType: "client",
  clientId: "client-1",
  supplierId: null,
  email: "c@example.com",
  name: "Client",
}

const ALLOW = { success: true, remaining: 99, reset: Date.now() + 60_000, limit: 100 }
const DENY = { success: false, remaining: 0, reset: Date.now() + 60_000, limit: 100 }

function makeReq(method: string, path = "/api/mobile/projects"): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { authorization: "Bearer token-1" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  getSessionMock.mockResolvedValue(SESSION)
  refreshSessionMock.mockResolvedValue(undefined)
  getPortalSessionMock.mockResolvedValue(PORTAL_SESSION)
  checkRateLimitMock.mockResolvedValue(ALLOW)
})

describe("withMobileAuth rate limiting", () => {
  it("classifies GET as api_read, keyed by userId:path", async () => {
    const { withMobileAuth } = await import("@/lib/mobile/auth")
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    await withMobileAuth(handler)(makeReq("GET"))
    expect(checkRateLimitMock).toHaveBeenCalledWith("api_read", "user-1:/api/mobile/projects")
    expect(handler).toHaveBeenCalled()
  })

  it("classifies POST as api_write", async () => {
    const { withMobileAuth } = await import("@/lib/mobile/auth")
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    await withMobileAuth(handler)(makeReq("POST"))
    expect(checkRateLimitMock).toHaveBeenCalledWith("api_write", "user-1:/api/mobile/projects")
  })

  it("returns 429 with Retry-After when the limit is exceeded", async () => {
    checkRateLimitMock.mockResolvedValue(DENY)
    const { withMobileAuth } = await import("@/lib/mobile/auth")
    const handler = vi.fn()
    const res = await withMobileAuth(handler)(makeReq("POST"))
    expect(res.status).toBe(429)
    expect((await res.json()).code).toBe("RATE_LIMITED")
    expect(res.headers.get("Retry-After")).toBeTruthy()
    expect(handler).not.toHaveBeenCalled()
  })

  it("does not consume rate-limit budget for unauthenticated requests", async () => {
    getSessionMock.mockRejectedValue(new Error("expired"))
    const { withMobileAuth } = await import("@/lib/mobile/auth")
    const res = await withMobileAuth(vi.fn())(makeReq("GET"))
    expect(res.status).toBe(401)
    expect(checkRateLimitMock).not.toHaveBeenCalled()
  })
})

describe("withPortalAuth rate limiting", () => {
  it("keys the limit by portal account, not by user", async () => {
    const { withPortalAuth } = await import("@/lib/portal-middleware")
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    await withPortalAuth(handler)(makeReq("GET", "/api/portal/projects"))
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "api_read",
      "portal:acct-1:/api/portal/projects"
    )
    expect(handler).toHaveBeenCalled()
  })

  it("returns 429 when the limit is exceeded", async () => {
    checkRateLimitMock.mockResolvedValue(DENY)
    const { withPortalAuth } = await import("@/lib/portal-middleware")
    const handler = vi.fn()
    const res = await withPortalAuth(handler)(makeReq("POST", "/api/portal/quotes"))
    expect(res.status).toBe(429)
    expect(handler).not.toHaveBeenCalled()
  })

  it("still 401s before rate limiting when there is no portal session", async () => {
    getPortalSessionMock.mockResolvedValue(null)
    const { withPortalAuth } = await import("@/lib/portal-middleware")
    const res = await withPortalAuth(vi.fn())(makeReq("GET", "/api/portal/projects"))
    expect(res.status).toBe(401)
    expect(checkRateLimitMock).not.toHaveBeenCalled()
  })
})
