import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates:
    (_opts: unknown, handler: (req: unknown, ctx: unknown) => unknown) =>
    (req: unknown, _ctxArg?: unknown) =>
      handler(req, {
        session: { companyId: "company-1", userId: "user-1", sessionId: "session-1" },
        ipAddress: "127.0.0.1",
        userAgent: "test",
      }),
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  sha256hex: vi.fn().mockResolvedValue("verification-hash-abc"),
  RoleSets: { admin: [], management: [] },
}))

vi.mock("@prv/auth/scope-resolver", () => ({
  resolveVisibleCompanyIds: vi.fn().mockResolvedValue([]),
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "item-1" }]),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  then: (resolve: (val: unknown[]) => void) => resolve([]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  notificationPreferences: { userId: {}, companyId: {} },
  users: { id: {}, companyId: {}, settings: {}, updatedAt: {} },
  userPresence: { userId: {}, status: {} },
  companyGroups: { id: {}, name: {}, slug: {}, isActive: {}, ownerId: {} },
  groupMemberships: { id: {}, groupId: {}, companyId: {}, isActive: {}, addedBy: {} },
  companies: { id: {}, isActive: {} },
  dataErasureRequests: {
    id: {},
    companyId: {},
    status: {},
    requestedBy: {},
    targetUserId: {},
    approvedBy: {},
    approvedAt: {},
    rejectedBy: {},
    rejectedAt: {},
    rejectionReason: {},
    completedAt: {},
    executedAt: {},
    verificationHash: {},
    erasureLog: {},
    updatedAt: {},
  },
  userMfaMethods: { id: {}, userId: {} },
  userDevices: { id: {}, userId: {} },
  userAuditLog: { id: {}, targetUserId: {}, ipAddress: {}, userAgent: {} },
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    ne: vi.fn(),
    isNull: vi.fn(),
    desc: vi.fn(),
    count: vi.fn(),
    inArray: vi.fn(),
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
    url: `http://localhost${path}`,
    headers: { get: () => null },
    json: async () => ({}),
    ...overrides,
  } as unknown as Request
}

function resetMocks() {
  vi.clearAllMocks()
  mockDb.select.mockReturnThis()
  mockDb.insert.mockReturnThis()
  mockDb.update.mockReturnThis()
  mockDb.delete.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockResolvedValue([])
  mockDb.set.mockReturnThis()
  mockDb.values.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.returning.mockResolvedValue([{ id: "item-1" }])
  mockDb.onConflictDoUpdate.mockReturnThis()
}

// ─── PATCH /api/me/notifications ─────────────────────────────────────────────

describe("PATCH /api/me/notifications", () => {
  beforeEach(resetMocks)

  it("returns 400 for invalid JSON", async () => {
    const { PATCH } = await import("@/app/api/me/notifications/route")
    const res = await PATCH(
      makeReq("/api/me/notifications", "PATCH", {
        json: async () => {
          throw new Error("bad json")
        },
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 422 for invalid quietHoursStart format", async () => {
    const { PATCH } = await import("@/app/api/me/notifications/route")
    const res = await PATCH(
      makeReq("/api/me/notifications", "PATCH", {
        json: async () => ({ quietHoursStart: "9am" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 400 for empty body", async () => {
    const { PATCH } = await import("@/app/api/me/notifications/route")
    const res = await PATCH(makeReq("/api/me/notifications", "PATCH"), webCtx)
    expect(res.status).toBe(400)
  })

  it("upserts preferences and returns 200 with ok:true", async () => {
    const { PATCH } = await import("@/app/api/me/notifications/route")
    const res = await PATCH(
      makeReq("/api/me/notifications", "PATCH", {
        json: async () => ({ push: false, email: true }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("fires audit log with action user.notifications.update", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { PATCH } = await import("@/app/api/me/notifications/route")
    await PATCH(
      makeReq("/api/me/notifications", "PATCH", {
        json: async () => ({ sms: true }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.notifications.update" })
    )
  })
})

// ─── PUT /api/me/pinned-contacts ──────────────────────────────────────────────

describe("PUT /api/me/pinned-contacts", () => {
  beforeEach(resetMocks)

  it("returns 422 for non-UUID contactIds", async () => {
    const { PUT } = await import("@/app/api/me/pinned-contacts/route")
    const res = await PUT(
      makeReq("/api/me/pinned-contacts", "PUT", {
        json: async () => ({ contactIds: ["not-a-uuid"] }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 200 with ok:true for empty contactIds array", async () => {
    mockDb.limit.mockResolvedValueOnce([{ settings: {} }])
    const { PUT } = await import("@/app/api/me/pinned-contacts/route")
    const res = await PUT(
      makeReq("/api/me/pinned-contacts", "PUT", {
        json: async () => ({ contactIds: [] }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("returns 200 with ok:true for valid UUID contactIds", async () => {
    mockDb.limit.mockResolvedValueOnce([{ settings: { dashboardPinnedContacts: [] } }])
    const { PUT } = await import("@/app/api/me/pinned-contacts/route")
    const res = await PUT(
      makeReq("/api/me/pinned-contacts", "PUT", {
        json: async () => ({
          contactIds: [
            "00000000-0000-0000-0000-000000000001",
            "00000000-0000-0000-0000-000000000002",
          ],
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})

// ─── POST /api/groups ─────────────────────────────────────────────────────────

describe("POST /api/groups", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing name", async () => {
    const { POST } = await import("@/app/api/groups/route")
    const res = await POST(
      makeReq("/api/groups", "POST", {
        json: async () => ({ slug: "my-group" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 422 for invalid slug with uppercase", async () => {
    const { POST } = await import("@/app/api/groups/route")
    const res = await POST(
      makeReq("/api/groups", "POST", {
        json: async () => ({ name: "My Group", slug: "My-Group" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("creates group and returns 201 with groupId and slug", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "grp-1", slug: "my-group" }])
    const { POST } = await import("@/app/api/groups/route")
    const res = await POST(
      makeReq("/api/groups", "POST", {
        json: async () => ({ name: "My Group", slug: "my-group" }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.groupId).toBe("grp-1")
    expect(body.slug).toBe("my-group")
  })

  it("fires audit log with action groups.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "grp-2", slug: "another-group" }])
    const { POST } = await import("@/app/api/groups/route")
    await POST(
      makeReq("/api/groups", "POST", {
        json: async () => ({ name: "Another Group", slug: "another-group" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "groups.create" }))
  })
})

// ─── POST /api/groups/[groupId]/companies ─────────────────────────────────────

describe("POST /api/groups/[groupId]/companies", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing companyId", async () => {
    const { POST } = await import("@/app/api/groups/[groupId]/companies/route")
    const res = await POST(makeReq("/api/groups/grp-1/companies"), webCtx)
    expect(res.status).toBe(422)
  })

  it("returns 422 for non-UUID companyId", async () => {
    const { POST } = await import("@/app/api/groups/[groupId]/companies/route")
    const res = await POST(
      makeReq("/api/groups/grp-1/companies", "POST", {
        json: async () => ({ companyId: "not-a-uuid" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when company not found", async () => {
    const { POST } = await import("@/app/api/groups/[groupId]/companies/route")
    const res = await POST(
      makeReq("/api/groups/grp-1/companies", "POST", {
        json: async () => ({ companyId: "00000000-0000-0000-0000-000000000001" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("adds company to group and returns 201 when membership is new", async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: "00000000-0000-0000-0000-000000000001" }]) // company exists
      .mockResolvedValueOnce([]) // no existing membership
    const { POST } = await import("@/app/api/groups/[groupId]/companies/route")
    const res = await POST(
      makeReq("/api/groups/grp-1/companies", "POST", {
        json: async () => ({ companyId: "00000000-0000-0000-0000-000000000001" }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("reactivates existing membership and returns 201", async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: "00000000-0000-0000-0000-000000000001" }]) // company exists
      .mockResolvedValueOnce([{ id: "membership-1" }]) // membership exists
    const { POST } = await import("@/app/api/groups/[groupId]/companies/route")
    const res = await POST(
      makeReq("/api/groups/grp-1/companies", "POST", {
        json: async () => ({ companyId: "00000000-0000-0000-0000-000000000001" }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
  })

  it("fires audit log with action groups.companies.add", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit
      .mockResolvedValueOnce([{ id: "00000000-0000-0000-0000-000000000001" }])
      .mockResolvedValueOnce([])
    const { POST } = await import("@/app/api/groups/[groupId]/companies/route")
    await POST(
      makeReq("/api/groups/grp-1/companies", "POST", {
        json: async () => ({ companyId: "00000000-0000-0000-0000-000000000001" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "groups.companies.add" })
    )
  })
})

// ─── DELETE /api/groups/[groupId]/companies ───────────────────────────────────

describe("DELETE /api/groups/[groupId]/companies", () => {
  beforeEach(resetMocks)

  it("returns 422 when companyId query param is missing", async () => {
    const { DELETE } = await import("@/app/api/groups/[groupId]/companies/route")
    const res = await DELETE(makeReq("/api/groups/grp-1/companies", "DELETE"), webCtx)
    expect(res.status).toBe(422)
  })

  it("removes company from group and returns 200 with success:true", async () => {
    const { DELETE } = await import("@/app/api/groups/[groupId]/companies/route")
    const res = await DELETE(
      {
        method: "DELETE",
        nextUrl: { pathname: "/api/groups/grp-1/companies" },
        url: "http://localhost/api/groups/grp-1/companies?companyId=company-abc",
        headers: { get: () => null },
        json: async () => ({}),
      } as unknown as Request,
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("fires audit log with action groups.companies.remove", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { DELETE } = await import("@/app/api/groups/[groupId]/companies/route")
    await DELETE(
      {
        method: "DELETE",
        nextUrl: { pathname: "/api/groups/grp-1/companies" },
        url: "http://localhost/api/groups/grp-1/companies?companyId=company-abc",
        headers: { get: () => null },
        json: async () => ({}),
      } as unknown as Request,
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "groups.companies.remove" })
    )
  })
})

// ─── POST /api/gdpr/erasure/[id]/approve ─────────────────────────────────────

describe("POST /api/gdpr/erasure/[id]/approve", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid body (missing approved field)", async () => {
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/approve/route")
    const res = await POST(makeReq("/api/gdpr/erasure/req-1/approve"), {
      params: Promise.resolve({ id: "req-1" }),
    } as never)
    expect(res.status).toBe(422)
  })

  it("returns 422 when rejectionReason is too short for approved:false", async () => {
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/approve/route")
    const res = await POST(
      makeReq("/api/gdpr/erasure/req-1/approve", "POST", {
        json: async () => ({ approved: false, rejectionReason: "short" }),
      }),
      { params: Promise.resolve({ id: "req-1" }) } as never
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when erasure request not found", async () => {
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/approve/route")
    const res = await POST(
      makeReq("/api/gdpr/erasure/req-1/approve", "POST", {
        json: async () => ({ approved: true }),
      }),
      { params: Promise.resolve({ id: "req-1" }) } as never
    )
    expect(res.status).toBe(404)
  })

  it("returns 409 when request is not in pending status", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "req-1", status: "approved", requestedBy: "other-user", targetUserId: "target-1" },
    ])
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/approve/route")
    const res = await POST(
      makeReq("/api/gdpr/erasure/req-1/approve", "POST", {
        json: async () => ({ approved: true }),
      }),
      { params: Promise.resolve({ id: "req-1" }) } as never
    )
    expect(res.status).toBe(409)
  })

  it("returns 403 when actor is the requester (self-approve)", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "req-1", status: "pending", requestedBy: "user-1", targetUserId: "target-1" },
    ])
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/approve/route")
    const res = await POST(
      makeReq("/api/gdpr/erasure/req-1/approve", "POST", {
        json: async () => ({ approved: true }),
      }),
      { params: Promise.resolve({ id: "req-1" }) } as never
    )
    expect(res.status).toBe(403)
  })

  it("returns 200 with status:approved on approval", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "req-1", status: "pending", requestedBy: "other-user", targetUserId: "target-1" },
    ])
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/approve/route")
    const res = await POST(
      makeReq("/api/gdpr/erasure/req-1/approve", "POST", {
        json: async () => ({ approved: true }),
      }),
      { params: Promise.resolve({ id: "req-1" }) } as never
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("approved")
  })

  it("returns 200 with status:rejected on rejection with reason", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "req-1", status: "pending", requestedBy: "other-user", targetUserId: "target-1" },
    ])
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/approve/route")
    const res = await POST(
      makeReq("/api/gdpr/erasure/req-1/approve", "POST", {
        json: async () => ({
          approved: false,
          rejectionReason: "Insufficient grounds for erasure",
        }),
      }),
      { params: Promise.resolve({ id: "req-1" }) } as never
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("rejected")
  })
})

// ─── POST /api/gdpr/erasure/[id]/execute ─────────────────────────────────────

describe("POST /api/gdpr/erasure/[id]/execute", () => {
  beforeEach(resetMocks)

  it("returns 404 when erasure request not found", async () => {
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/execute/route")
    const res = await POST(makeReq("/api/gdpr/erasure/req-1/execute"), {
      params: Promise.resolve({ id: "req-1" }),
    } as never)
    expect(res.status).toBe(404)
  })

  it("returns 409 when request is not in approved status", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "req-1", status: "pending", targetUserId: "target-1" },
    ])
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/execute/route")
    const res = await POST(makeReq("/api/gdpr/erasure/req-1/execute"), {
      params: Promise.resolve({ id: "req-1" }),
    } as never)
    expect(res.status).toBe(409)
  })

  it("returns 409 when locking fails (already executing)", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "req-1", status: "approved", targetUserId: "target-1" },
    ])
    mockDb.returning.mockResolvedValueOnce([]) // lock fails
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/execute/route")
    const res = await POST(makeReq("/api/gdpr/erasure/req-1/execute"), {
      params: Promise.resolve({ id: "req-1" }),
    } as never)
    expect(res.status).toBe(409)
  })

  it("executes erasure pipeline and returns 200 with verificationHash", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "req-1", status: "approved", targetUserId: "target-1" },
    ])
    mockDb.returning
      .mockResolvedValueOnce([{ id: "req-1" }]) // lock succeeds
      .mockResolvedValueOnce([{ id: "target-1" }]) // users anonymized
      .mockResolvedValueOnce([]) // mfa deleted (0 rows)
      .mockResolvedValueOnce([]) // devices deleted (0 rows)
      .mockResolvedValueOnce([]) // audit log anonymized (0 rows)
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/execute/route")
    const res = await POST(makeReq("/api/gdpr/erasure/req-1/execute"), {
      params: Promise.resolve({ id: "req-1" }),
    } as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.verificationHash).toBe("verification-hash-abc")
    expect(Array.isArray(body.erasureLog)).toBe(true)
  })
})
