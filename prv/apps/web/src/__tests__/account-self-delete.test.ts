import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

vi.mock("@/lib/with-gates", () => ({ withGates: (_o: unknown, h: unknown) => h }))
vi.mock("@/lib/mobile/auth", () => ({ withMobileAuth: (h: unknown) => h }))
const auditSpy = vi.fn()
vi.mock("@prv/auth", () => ({ writeAuditLog: auditSpy, RoleSets: { admin: [] } }))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  limit: vi.fn(() => nextResult()),
  returning: vi.fn(() => nextResult()),
  then: (r: (v: unknown[]) => void) => r(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => ({
  users: {},
  userMfaMethods: {},
  userDevices: {},
  userAuditLog: {},
}))
vi.mock("drizzle-orm", async (o) => {
  const actual = await o<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn() }
})

const UID = "11111111-1111-1111-1111-111111111111"
const webCtx = {
  session: { companyId: "co-1", userId: UID, sessionId: "s-1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const mobileCtx = { companyId: "co-1", userId: UID, sessionId: "s-1" }

function req(path: string): NextRequest {
  return {
    method: "DELETE",
    nextUrl: { pathname: path, searchParams: new URLSearchParams() },
    url: `http://localhost${path}`,
    json: async () => ({}),
    headers: { get: () => null },
  } as unknown as NextRequest
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "update", "delete", "from", "where", "set"] as const)
    mockDb[m].mockReturnThis()
  mockDb.limit.mockImplementation(() => nextResult())
  mockDb.returning.mockImplementation(() => nextResult())
}
// The erasure pipeline runs 4 statements, each ending in .returning().
function pushErasureResults() {
  queue.push([{ id: UID }]) // users anonymized
  queue.push([]) // mfa deleted
  queue.push([]) // devices deleted
  queue.push([]) // audit anonymized
}

describe("DELETE /api/me — self-service account deletion", () => {
  beforeEach(reset)

  it("anonymizes the caller's own account and returns 204", async () => {
    queue.push([{ id: UID, deletedAt: null }]) // existence check
    pushErasureResults()
    const { DELETE } = await import("@/app/api/me/route")
    const res = await DELETE(req("/api/me"), webCtx)
    expect(res.status).toBe(204)
    // users row was anonymized (not hard-deleted)
    expect(mockDb.update).toHaveBeenCalled()
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "ERASED", isActive: false })
    )
  })

  it("audits the self-deletion", async () => {
    queue.push([{ id: UID, deletedAt: null }])
    pushErasureResults()
    const { DELETE } = await import("@/app/api/me/route")
    await DELETE(req("/api/me"), webCtx)
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.account.self_delete", entityId: UID })
    )
  })

  it("404s when the caller has no user row", async () => {
    queue.push([]) // no user
    const { DELETE } = await import("@/app/api/me/route")
    const res = await DELETE(req("/api/me"), webCtx)
    expect(res.status).toBe(404)
  })

  it("409s when the account is already deleted", async () => {
    queue.push([{ id: UID, deletedAt: new Date() }])
    const { DELETE } = await import("@/app/api/me/route")
    const res = await DELETE(req("/api/me"), webCtx)
    expect(res.status).toBe(409)
    expect(mockDb.update).not.toHaveBeenCalled()
  })
})

describe("DELETE /api/mobile/account — self-service account deletion", () => {
  beforeEach(reset)

  it("anonymizes the caller's own account and returns 204", async () => {
    queue.push([{ id: UID, deletedAt: null }])
    pushErasureResults()
    const { DELETE } = await import("@/app/api/mobile/account/route")
    const res = await DELETE(req("/api/mobile/account"), mobileCtx)
    expect(res.status).toBe(204)
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "ERASED", isActive: false })
    )
  })

  it("409s when already deleted", async () => {
    queue.push([{ id: UID, deletedAt: new Date() }])
    const { DELETE } = await import("@/app/api/mobile/account/route")
    const res = await DELETE(req("/api/mobile/account"), mobileCtx)
    expect(res.status).toBe(409)
  })
})
