import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@/lib/mobile/auth", () => ({
  withMobileAuth: (handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
  revokeSession: vi.fn().mockResolvedValue(undefined),
  RoleSets: { admin: ["admin", "owner"] },
}))

vi.mock("@prv/jobs/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock("@prv/cache", () => ({
  getRedis: vi.fn(() => ({
    smembers: vi.fn().mockResolvedValue(["session-1", "session-other-1", "session-other-2"]),
  })),
  cacheKey: {
    userSessions: vi.fn((userId: string) => `user_sessions:${userId}`),
  },
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockResolvedValue([]),
  returning: vi.fn().mockResolvedValue([{ id: "1" }]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  users: {},
  userPresence: {},
  notifications: {},
  notificationPreferences: {},
  companyMemberships: {},
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    desc: vi.fn(),
    sql: vi.fn(),
  }
})

const webCtx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "session-1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}

const mobileCtx = {
  companyId: "company-1",
  userId: "user-1",
  sessionId: "session-1",
}

function makeReq(path: string, method = "GET", overrides: Partial<Request> = {}): Request {
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
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockReturnThis()
  mockDb.set.mockReturnThis()
  mockDb.values.mockReturnThis()
  mockDb.onConflictDoUpdate.mockResolvedValue([])
  mockDb.returning.mockResolvedValue([{ id: "1" }])
}

// ─── /api/me PATCH ────────────────────────────────────────────────────────────

describe("PATCH /api/me", () => {
  beforeEach(resetMocks)

  it("returns 400 when body has no updatable fields", async () => {
    const { PATCH } = await import("@/app/api/me/route")
    const res = await PATCH(makeReq("/api/me", "PATCH", { json: async () => ({}) }), webCtx)
    expect(res.status).toBe(400)
  })

  it("returns 422 when field fails schema validation", async () => {
    const { PATCH } = await import("@/app/api/me/route")
    const res = await PATCH(
      makeReq("/api/me", "PATCH", {
        json: async () => ({ firstName: "" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("updates profile and returns 200 with ok: true", async () => {
    const { PATCH } = await import("@/app/api/me/route")
    const res = await PATCH(
      makeReq("/api/me", "PATCH", {
        json: async () => ({ firstName: "Jane", lastName: "Doe" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("fires audit log with action user.profile.update", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { PATCH } = await import("@/app/api/me/route")
    await PATCH(
      makeReq("/api/me", "PATCH", {
        json: async () => ({ bio: "Engineer at PRV" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.profile.update" })
    )
  })
})

// ─── /api/presence/override POST ──────────────────────────────────────────────

describe("POST /api/presence/override", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid status value", async () => {
    const { POST } = await import("@/app/api/presence/override/route")
    const res = await POST(
      makeReq("/api/presence/override", "POST", {
        json: async () => ({ status: "invisible" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("upserts presence and returns 200 with status", async () => {
    const { POST } = await import("@/app/api/presence/override/route")
    const res = await POST(
      makeReq("/api/presence/override", "POST", {
        json: async () => ({ status: "busy", statusMessage: "In a meeting" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.status).toBe("busy")
  })

  it("sends inngest event when expiresAt is set", async () => {
    const { inngest } = await import("@prv/jobs/client")
    const { POST } = await import("@/app/api/presence/override/route")
    await POST(
      makeReq("/api/presence/override", "POST", {
        json: async () => ({
          status: "do_not_disturb",
          isManualOverride: true,
          manualOverrideExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        }),
      }),
      webCtx
    )
    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: "prv/presence.manual_set" })
    )
  })
})

// ─── /api/presence/override DELETE ───────────────────────────────────────────

describe("DELETE /api/presence/override", () => {
  beforeEach(resetMocks)

  it("clears override and returns 200 with status online", async () => {
    const { DELETE } = await import("@/app/api/presence/override/route")
    const res = await DELETE(makeReq("/api/presence/override", "DELETE"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.status).toBe("online")
  })
})

// ─── /api/mobile/inbox PATCH ──────────────────────────────────────────────────

describe("PATCH /api/mobile/inbox", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid action", async () => {
    const { PATCH } = await import("@/app/api/mobile/inbox/route")
    const res = await PATCH(
      makeReq("/api/mobile/inbox", "PATCH", {
        json: async () => ({ action: "archive" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })

  it("marks single notification as read", async () => {
    const { PATCH } = await import("@/app/api/mobile/inbox/route")
    const res = await PATCH(
      makeReq("/api/mobile/inbox", "PATCH", {
        json: async () => ({ action: "markRead", id: "11111111-1111-1111-1111-111111111111" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("marks all notifications as read", async () => {
    const { PATCH } = await import("@/app/api/mobile/inbox/route")
    const res = await PATCH(
      makeReq("/api/mobile/inbox", "PATCH", {
        json: async () => ({ action: "markAllRead" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("dismisses a notification", async () => {
    const { PATCH } = await import("@/app/api/mobile/inbox/route")
    const res = await PATCH(
      makeReq("/api/mobile/inbox", "PATCH", {
        json: async () => ({ action: "dismiss", id: "22222222-2222-2222-2222-222222222222" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ─── /api/mobile/notifications/preferences PATCH ─────────────────────────────

describe("PATCH /api/mobile/notifications/preferences", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid quiet hours format", async () => {
    const { PATCH } = await import("@/app/api/mobile/notifications/preferences/route")
    const res = await PATCH(
      makeReq("/api/mobile/notifications/preferences", "PATCH", {
        json: async () => ({ quietHoursStart: "9:00" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 400 when body has no updatable fields", async () => {
    const { PATCH } = await import("@/app/api/mobile/notifications/preferences/route")
    const res = await PATCH(
      makeReq("/api/mobile/notifications/preferences", "PATCH", {
        json: async () => ({}),
      }),
      mobileCtx
    )
    expect(res.status).toBe(400)
  })

  it("upserts preferences and returns 200 with success: true", async () => {
    const { PATCH } = await import("@/app/api/mobile/notifications/preferences/route")
    const res = await PATCH(
      makeReq("/api/mobile/notifications/preferences", "PATCH", {
        json: async () => ({ push: false, email: true }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ─── /api/mobile/security/sessions DELETE ────────────────────────────────────

describe("DELETE /api/mobile/security/sessions", () => {
  beforeEach(resetMocks)

  it("revokes all other sessions and returns revokedCount", async () => {
    const { DELETE } = await import("@/app/api/mobile/security/sessions/route")
    const res = await DELETE(makeReq("/api/mobile/security/sessions", "DELETE"), mobileCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.revokedCount).toBe(2)
  })

  it("fires audit log with action mobile.security.sessions.revoke_all", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { DELETE } = await import("@/app/api/mobile/security/sessions/route")
    await DELETE(makeReq("/api/mobile/security/sessions", "DELETE"), mobileCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "mobile.security.sessions.revoke_all" })
    )
  })
})

// ─── /api/companies/[id]/members/[userId] DELETE ─────────────────────────────

describe("DELETE /api/companies/[id]/members/[userId]", () => {
  beforeEach(resetMocks)

  it("returns 400 when path is missing required segments", async () => {
    const { DELETE } = await import("@/app/api/companies/[id]/members/[userId]/route")
    const res = await DELETE(makeReq("/api/companies/company-1"), webCtx)
    expect(res.status).toBe(400)
  })

  it("returns 403 when companyId does not match session", async () => {
    const { DELETE } = await import("@/app/api/companies/[id]/members/[userId]/route")
    const res = await DELETE(
      makeReq("/api/companies/other-company/members/user-2", "DELETE"),
      webCtx
    )
    expect(res.status).toBe(403)
  })

  it("returns 422 when attempting self-removal", async () => {
    const { DELETE } = await import("@/app/api/companies/[id]/members/[userId]/route")
    const res = await DELETE(makeReq("/api/companies/company-1/members/user-1", "DELETE"), webCtx)
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.code).toBe("SELF_REMOVAL")
  })

  it("returns 404 when membership not found", async () => {
    mockDb.returning.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/companies/[id]/members/[userId]/route")
    const res = await DELETE(makeReq("/api/companies/company-1/members/user-2", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("deactivates membership and returns 200 with updated record", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "m-1", status: "INACTIVE" }])

    const { DELETE } = await import("@/app/api/companies/[id]/members/[userId]/route")
    const res = await DELETE(makeReq("/api/companies/company-1/members/user-2", "DELETE"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("INACTIVE")
  })

  it("fires audit log with action companies.members.remove", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "m-1", status: "INACTIVE" }])

    const { DELETE } = await import("@/app/api/companies/[id]/members/[userId]/route")
    await DELETE(makeReq("/api/companies/company-1/members/user-2", "DELETE"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "companies.members.remove" })
    )
  })
})
