import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}))

const mockRedis = {
  get: vi.fn().mockResolvedValue({ userId: "user-1" }),
  del: vi.fn().mockResolvedValue(1),
  srem: vi.fn().mockResolvedValue(1),
}

vi.mock("@prv/cache", () => ({
  getRedis: vi.fn(() => mockRedis),
  cacheKey: {
    session: vi.fn((id: string) => `session:${id}`),
    userSessions: vi.fn((userId: string) => `user_sessions:${userId}`),
  },
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockResolvedValue([]),
  returning: vi.fn().mockResolvedValue([{ id: "1" }]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  leaveRequests: {},
  users: {},
  stores: {},
  auditLogs: {},
  socialProfiles: {},
  digitalBusinessCards: {},
  mfaBackupCodes: {},
  userDevices: {},
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    desc: vi.fn(),
    like: vi.fn(),
  }
})

const webCtx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "session-1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}

function makeReq(path: string, method = "POST", overrides: Partial<Request> = {}): Request {
  return {
    method,
    nextUrl: { pathname: path },
    headers: { get: () => null },
    json: async () => ({}),
    ...overrides,
  } as unknown as Request
}

function resetMocks() {
  vi.resetAllMocks()
  mockDb.select.mockReturnThis()
  mockDb.update.mockReturnThis()
  mockDb.insert.mockReturnThis()
  mockDb.delete.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockReturnThis()
  mockDb.set.mockReturnThis()
  mockDb.values.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.onConflictDoUpdate.mockResolvedValue([])
  mockDb.returning.mockResolvedValue([{ id: "1" }])
  mockRedis.get.mockResolvedValue({ userId: "user-1" })
  mockRedis.del.mockResolvedValue(1)
  mockRedis.srem.mockResolvedValue(1)
}

// ─── /api/finance/invoices/[id]/payment POST ─────────────────────────────────

describe("POST /api/finance/invoices/[id]/payment", () => {
  beforeEach(resetMocks)

  it("returns 400 for missing required fields", async () => {
    const { POST } = await import("@/app/api/finance/invoices/[id]/payment/route")
    const res = await POST(makeReq("/api/finance/invoices/inv-1/payment"), webCtx)
    expect(res.status).toBe(400)
  })

  it("records payment and returns 200 with success:true", async () => {
    const { POST } = await import("@/app/api/finance/invoices/[id]/payment/route")
    const res = await POST(
      makeReq("/api/finance/invoices/inv-1/payment", "POST", {
        json: async () => ({ method: "bank_transfer", paidDate: "2025-01-15" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.method).toBe("bank_transfer")
  })

  it("fires audit log with action finance.invoice.payment", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/finance/invoices/[id]/payment/route")
    await POST(
      makeReq("/api/finance/invoices/inv-1/payment", "POST", {
        json: async () => ({ method: "cash", paidDate: "2025-01-15" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "finance.invoice.payment" })
    )
  })
})

// ─── /api/finance/invoices/[id]/void POST ────────────────────────────────────

describe("POST /api/finance/invoices/[id]/void", () => {
  beforeEach(resetMocks)

  it("returns 400 for missing reason", async () => {
    const { POST } = await import("@/app/api/finance/invoices/[id]/void/route")
    const res = await POST(makeReq("/api/finance/invoices/inv-1/void"), webCtx)
    expect(res.status).toBe(400)
  })

  it("voids invoice and returns 200 with success:true", async () => {
    const { POST } = await import("@/app/api/finance/invoices/[id]/void/route")
    const res = await POST(
      makeReq("/api/finance/invoices/inv-1/void", "POST", {
        json: async () => ({ reason: "Duplicate invoice" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("fires audit log with action finance.invoice.void", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/finance/invoices/[id]/void/route")
    await POST(
      makeReq("/api/finance/invoices/inv-1/void", "POST", {
        json: async () => ({ reason: "Error in amounts" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "finance.invoice.void" })
    )
  })
})

// ─── /api/people/time-off/[id] POST ──────────────────────────────────────────

describe("POST /api/people/time-off/[id]", () => {
  beforeEach(resetMocks)

  it("returns 400 for missing action", async () => {
    const { POST } = await import("@/app/api/people/time-off/[id]/route")
    const res = await POST(makeReq("/api/people/time-off/req-1"), webCtx)
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid action value", async () => {
    const { POST } = await import("@/app/api/people/time-off/[id]/route")
    const res = await POST(
      makeReq("/api/people/time-off/req-1", "POST", {
        json: async () => ({ action: "cancel" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("approves time-off and returns 200 with success:true", async () => {
    const { POST } = await import("@/app/api/people/time-off/[id]/route")
    const res = await POST(
      makeReq("/api/people/time-off/req-1", "POST", {
        json: async () => ({ action: "approve" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.action).toBe("approve")
  })

  it("fires audit log with action hr.time_off.approve", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/people/time-off/[id]/route")
    await POST(
      makeReq("/api/people/time-off/req-1", "POST", {
        json: async () => ({ action: "approve" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "hr.time_off.approve" })
    )
  })

  it("fires audit log with action hr.time_off.decline when declining", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/people/time-off/[id]/route")
    await POST(
      makeReq("/api/people/time-off/req-1", "POST", {
        json: async () => ({ action: "decline", reason: "Insufficient leave balance" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "hr.time_off.decline" })
    )
  })
})

// ─── /api/me/social POST ─────────────────────────────────────────────────────

describe("POST /api/me/social", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid platform", async () => {
    const { POST } = await import("@/app/api/me/social/route")
    const res = await POST(
      makeReq("/api/me/social", "POST", {
        json: async () => ({ platform: "myspace", url: "https://example.com" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 422 for invalid URL", async () => {
    const { POST } = await import("@/app/api/me/social/route")
    const res = await POST(
      makeReq("/api/me/social", "POST", {
        json: async () => ({ platform: "linkedin", url: "not-a-url" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("upserts social profile and returns 200 with ok:true", async () => {
    const { POST } = await import("@/app/api/me/social/route")
    const res = await POST(
      makeReq("/api/me/social", "POST", {
        json: async () => ({
          platform: "linkedin",
          url: "https://linkedin.com/in/testuser",
          isPublic: true,
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("fires audit log with action social_profiles.edit_own", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/me/social/route")
    await POST(
      makeReq("/api/me/social", "POST", {
        json: async () => ({ platform: "github", url: "https://github.com/testuser" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "social_profiles.edit_own" })
    )
  })
})

// ─── /api/me/social DELETE ────────────────────────────────────────────────────

describe("DELETE /api/me/social", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid platform", async () => {
    const { DELETE } = await import("@/app/api/me/social/route")
    const res = await DELETE(
      makeReq("/api/me/social", "DELETE", {
        json: async () => ({ platform: "badsite" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("deletes social profile and returns 200 with ok:true", async () => {
    const { DELETE } = await import("@/app/api/me/social/route")
    const res = await DELETE(
      makeReq("/api/me/social", "DELETE", {
        json: async () => ({ platform: "linkedin" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("fires audit log with action social_profiles.delete_own", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { DELETE } = await import("@/app/api/me/social/route")
    await DELETE(
      makeReq("/api/me/social", "DELETE", {
        json: async () => ({ platform: "github" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "social_profiles.delete_own" })
    )
  })
})

// ─── /api/me/card PUT ─────────────────────────────────────────────────────────

describe("PUT /api/me/card", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid email", async () => {
    const { PUT } = await import("@/app/api/me/card/route")
    const res = await PUT(
      makeReq("/api/me/card", "PUT", {
        json: async () => ({ email: "not-an-email" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("upserts business card and returns 200 with ok:true", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "card-1", publicSlug: "user-slug" }])
    mockDb.limit.mockResolvedValueOnce([{ id: "card-1", headline: "Engineer" }])

    const { PUT } = await import("@/app/api/me/card/route")
    const res = await PUT(
      makeReq("/api/me/card", "PUT", {
        json: async () => ({ headline: "Engineer", isPublic: true }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("fires audit log with action business_card.update", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([])
    mockDb.limit.mockResolvedValueOnce([{ id: "card-1", headline: "Engineer" }])

    const { PUT } = await import("@/app/api/me/card/route")
    await PUT(
      makeReq("/api/me/card", "PUT", {
        json: async () => ({ headline: "Lead Engineer" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "business_card.update" })
    )
  })
})

// ─── /api/me/security DELETE ─────────────────────────────────────────────────

describe("DELETE /api/me/security", () => {
  beforeEach(resetMocks)

  it("returns 400 when sessionId query param missing", async () => {
    const { DELETE } = await import("@/app/api/me/security/route")
    const res = await DELETE(
      {
        method: "DELETE",
        url: "http://localhost/api/me/security",
        nextUrl: { pathname: "/api/me/security" },
        headers: { get: () => null },
        json: async () => ({}),
      } as unknown as Request,
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 when attempting to revoke current session", async () => {
    const { DELETE } = await import("@/app/api/me/security/route")
    const res = await DELETE(
      {
        method: "DELETE",
        url: "http://localhost/api/me/security?sessionId=session-1",
        nextUrl: { pathname: "/api/me/security" },
        headers: { get: () => null },
        json: async () => ({}),
      } as unknown as Request,
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 404 when session not found in redis", async () => {
    mockRedis.get.mockResolvedValueOnce(null)
    const { DELETE } = await import("@/app/api/me/security/route")
    const res = await DELETE(
      {
        method: "DELETE",
        url: "http://localhost/api/me/security?sessionId=session-other",
        nextUrl: { pathname: "/api/me/security" },
        headers: { get: () => null },
        json: async () => ({}),
      } as unknown as Request,
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("revokes session and returns 200 with ok:true", async () => {
    mockRedis.get.mockResolvedValueOnce({ userId: "user-1" })
    const { DELETE } = await import("@/app/api/me/security/route")
    const res = await DELETE(
      {
        method: "DELETE",
        url: "http://localhost/api/me/security?sessionId=session-other",
        nextUrl: { pathname: "/api/me/security" },
        headers: { get: () => null },
        json: async () => ({}),
      } as unknown as Request,
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("fires audit log with action user.session.revoke", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockRedis.get.mockResolvedValueOnce({ userId: "user-1" })
    const { DELETE } = await import("@/app/api/me/security/route")
    await DELETE(
      {
        method: "DELETE",
        url: "http://localhost/api/me/security?sessionId=session-other",
        nextUrl: { pathname: "/api/me/security" },
        headers: { get: () => null },
        json: async () => ({}),
      } as unknown as Request,
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.session.revoke" })
    )
  })
})
