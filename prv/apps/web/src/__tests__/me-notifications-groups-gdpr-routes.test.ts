import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mockCtx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "session-1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => (req: unknown, _ctxArg?: unknown) =>
    (handler as (r: unknown, c: unknown) => unknown)(req, mockCtx),
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
  orderBy: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "item-1" }]),
  leftJoin: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  then: (resolve: (val: unknown[]) => void) => resolve([]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  notificationPreferences: { userId: {}, companyId: {}, updatedAt: {} },
  users: { id: {}, settings: {}, companyId: {}, updatedAt: {} },
  userPresence: { userId: {}, status: {} },
  companyGroups: {
    id: {},
    name: {},
    slug: {},
    description: {},
    logoUrl: {},
    isActive: {},
    createdAt: {},
    ownerId: {},
  },
  groupMemberships: {
    id: {},
    groupId: {},
    companyId: {},
    isActive: {},
    leftAt: {},
    updatedAt: {},
    addedBy: {},
  },
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
    executedAt: {},
    completedAt: {},
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
    inArray: vi.fn(),
    count: vi.fn(),
    desc: vi.fn(),
  }
})

function makeReq(
  path: string,
  method = "POST",
  overrides: Record<string, unknown> = {}
): NextRequest {
  return {
    method,
    nextUrl: { pathname: path },
    url: `http://localhost${path}`,
    headers: { get: () => null },
    json: async () => ({}),
    ...overrides,
  } as unknown as NextRequest
}

function resetMocks() {
  vi.clearAllMocks()
  mockDb.select.mockReturnThis()
  mockDb.insert.mockReturnThis()
  mockDb.update.mockReturnThis()
  mockDb.delete.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockReset()
  mockDb.limit.mockResolvedValue([])
  mockDb.set.mockReturnThis()
  mockDb.values.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.returning.mockReset()
  mockDb.returning.mockResolvedValue([{ id: "item-1" }])
  mockDb.leftJoin.mockReturnThis()
  mockDb.onConflictDoUpdate.mockReturnThis()
}

// ─── PATCH /api/me/notifications ──────────────────────────────────────────────

describe("PATCH /api/me/notifications", () => {
  beforeEach(resetMocks)

  it("returns 400 when no fields provided", async () => {
    const { PATCH } = await import("@/app/api/me/notifications/route")
    const res = await PATCH(makeReq("/api/me/notifications", "PATCH"), mockCtx)
    expect(res.status).toBe(400)
  })

  it("returns 422 for invalid quietHoursStart format", async () => {
    const { PATCH } = await import("@/app/api/me/notifications/route")
    const res = await PATCH(
      makeReq("/api/me/notifications", "PATCH", {
        json: async () => ({ quietHoursStart: "9am" }),
      }),
      mockCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 200 with ok:true on valid update", async () => {
    const { PATCH } = await import("@/app/api/me/notifications/route")
    const res = await PATCH(
      makeReq("/api/me/notifications", "PATCH", {
        json: async () => ({ inApp: true, push: false }),
      }),
      mockCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("returns 200 with valid quietHours times", async () => {
    const { PATCH } = await import("@/app/api/me/notifications/route")
    const res = await PATCH(
      makeReq("/api/me/notifications", "PATCH", {
        json: async () => ({ quietHoursStart: "22:00", quietHoursEnd: "07:00" }),
      }),
      mockCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})

// ─── PUT /api/me/pinned-contacts ───────────────────────────────────────────────

describe("PUT /api/me/pinned-contacts", () => {
  beforeEach(resetMocks)

  it("returns 422 when contactIds is missing", async () => {
    const { PUT } = await import("@/app/api/me/pinned-contacts/route")
    const res = await PUT(makeReq("/api/me/pinned-contacts", "PUT"), mockCtx)
    expect(res.status).toBe(422)
  })

  it("returns 422 when contactIds contains non-UUIDs", async () => {
    const { PUT } = await import("@/app/api/me/pinned-contacts/route")
    const res = await PUT(
      makeReq("/api/me/pinned-contacts", "PUT", {
        json: async () => ({ contactIds: ["not-a-uuid"] }),
      }),
      mockCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 422 when too many contactIds (>6)", async () => {
    const { PUT } = await import("@/app/api/me/pinned-contacts/route")
    const res = await PUT(
      makeReq("/api/me/pinned-contacts", "PUT", {
        json: async () => ({
          contactIds: [
            "00000000-0000-0000-0000-000000000001",
            "00000000-0000-0000-0000-000000000002",
            "00000000-0000-0000-0000-000000000003",
            "00000000-0000-0000-0000-000000000004",
            "00000000-0000-0000-0000-000000000005",
            "00000000-0000-0000-0000-000000000006",
            "00000000-0000-0000-0000-000000000007",
          ],
        }),
      }),
      mockCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 200 with ok:true on valid contactIds", async () => {
    mockDb.limit.mockResolvedValueOnce([{ settings: {} }])
    const { PUT } = await import("@/app/api/me/pinned-contacts/route")
    const res = await PUT(
      makeReq("/api/me/pinned-contacts", "PUT", {
        json: async () => ({ contactIds: ["00000000-0000-0000-0000-000000000001"] }),
      }),
      mockCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})

// ─── POST /api/groups ──────────────────────────────────────────────────────────

describe("POST /api/groups", () => {
  beforeEach(resetMocks)

  it("returns 422 when name is too short", async () => {
    const { POST } = await import("@/app/api/groups/route")
    const res = await POST(
      makeReq("/api/groups", "POST", {
        json: async () => ({ name: "x", slug: "test-group" }),
      }),
      mockCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 422 when slug has invalid characters", async () => {
    const { POST } = await import("@/app/api/groups/route")
    const res = await POST(
      makeReq("/api/groups", "POST", {
        json: async () => ({ name: "Test Group", slug: "Test Group" }),
      }),
      mockCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 201 with groupId and slug on success", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "group-1", slug: "test-group" }])
    const { POST } = await import("@/app/api/groups/route")
    const res = await POST(
      makeReq("/api/groups", "POST", {
        json: async () => ({ name: "Test Group", slug: "test-group" }),
      }),
      mockCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.groupId).toBe("group-1")
    expect(body.slug).toBe("test-group")
  })
})

// ─── POST /api/groups/[groupId]/companies ─────────────────────────────────────

describe("POST /api/groups/[groupId]/companies", () => {
  beforeEach(resetMocks)

  it("returns 422 for non-UUID companyId", async () => {
    const { POST } = await import("@/app/api/groups/[groupId]/companies/route")
    const res = await POST(
      makeReq("/api/groups/group-1/companies", "POST", {
        json: async () => ({ companyId: "not-a-uuid" }),
      }),
      mockCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when company not found", async () => {
    const { POST } = await import("@/app/api/groups/[groupId]/companies/route")
    const res = await POST(
      makeReq("/api/groups/group-1/companies", "POST", {
        json: async () => ({ companyId: "00000000-0000-0000-0000-000000000001" }),
      }),
      mockCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 201 on successful add", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "00000000-0000-0000-0000-000000000001" }])
    const { POST } = await import("@/app/api/groups/[groupId]/companies/route")
    const res = await POST(
      makeReq("/api/groups/group-1/companies", "POST", {
        json: async () => ({ companyId: "00000000-0000-0000-0000-000000000001" }),
      }),
      mockCtx
    )
    expect(res.status).toBe(201)
  })
})

// ─── DELETE /api/groups/[groupId]/companies ────────────────────────────────────

describe("DELETE /api/groups/[groupId]/companies", () => {
  beforeEach(resetMocks)

  it("returns 422 when companyId query param is missing", async () => {
    const { DELETE } = await import("@/app/api/groups/[groupId]/companies/route")
    const res = await DELETE(makeReq("/api/groups/group-1/companies", "DELETE"), mockCtx)
    expect(res.status).toBe(422)
  })

  it("returns 200 with success when company removed", async () => {
    const { DELETE } = await import("@/app/api/groups/[groupId]/companies/route")
    const res = await DELETE(
      {
        method: "DELETE",
        nextUrl: { pathname: "/api/groups/group-1/companies" },
        url: "http://localhost/api/groups/group-1/companies?companyId=00000000-0000-0000-0000-000000000001",
        headers: { get: () => null },
        json: async () => ({}),
      } as unknown as NextRequest,
      mockCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ─── POST /api/gdpr/erasure/[id]/approve ──────────────────────────────────────

describe("POST /api/gdpr/erasure/[id]/approve", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing approved field", async () => {
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/approve/route")
    const res = await POST(makeReq("/api/gdpr/erasure/erasing-1/approve"), {
      params: Promise.resolve({ id: "erasing-1" }),
    } as never)
    expect(res.status).toBe(422)
  })

  it("returns 404 when erasure request not found", async () => {
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/approve/route")
    const res = await POST(
      makeReq("/api/gdpr/erasure/erasing-1/approve", "POST", {
        json: async () => ({ approved: true }),
      }),
      { params: Promise.resolve({ id: "erasing-1" }) } as never
    )
    expect(res.status).toBe(404)
  })

  it("returns 403 when approving own erasure request", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "erasing-1",
        status: "pending",
        requestedBy: "user-1",
        targetUserId: "target-1",
        companyId: "company-1",
      },
    ])
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/approve/route")
    const res = await POST(
      makeReq("/api/gdpr/erasure/erasing-1/approve", "POST", {
        json: async () => ({ approved: true }),
      }),
      { params: Promise.resolve({ id: "erasing-1" }) } as never
    )
    expect(res.status).toBe(403)
  })

  it("returns 200 with status approved", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "erasing-1",
        status: "pending",
        requestedBy: "other-user",
        targetUserId: "target-1",
        companyId: "company-1",
      },
    ])
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/approve/route")
    const res = await POST(
      makeReq("/api/gdpr/erasure/erasing-1/approve", "POST", {
        json: async () => ({ approved: true }),
      }),
      { params: Promise.resolve({ id: "erasing-1" }) } as never
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("approved")
  })

  it("returns 200 with status rejected when approved:false", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "erasing-1",
        status: "pending",
        requestedBy: "other-user",
        targetUserId: "target-1",
        companyId: "company-1",
      },
    ])
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/approve/route")
    const res = await POST(
      makeReq("/api/gdpr/erasure/erasing-1/approve", "POST", {
        json: async () => ({ approved: false, rejectionReason: "Not compliant with policy" }),
      }),
      { params: Promise.resolve({ id: "erasing-1" }) } as never
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("rejected")
  })
})

// ─── POST /api/gdpr/erasure/[id]/execute ──────────────────────────────────────

describe("POST /api/gdpr/erasure/[id]/execute", () => {
  beforeEach(resetMocks)

  it("returns 404 when erasure request not found", async () => {
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/execute/route")
    const res = await POST(makeReq("/api/gdpr/erasure/erasing-1/execute"), {
      params: Promise.resolve({ id: "erasing-1" }),
    } as never)
    expect(res.status).toBe(404)
  })

  it("returns 409 when request status is not approved", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "erasing-1",
        status: "pending",
        targetUserId: "target-1",
        companyId: "company-1",
      },
    ])
    const { POST } = await import("@/app/api/gdpr/erasure/[id]/execute/route")
    const res = await POST(makeReq("/api/gdpr/erasure/erasing-1/execute"), {
      params: Promise.resolve({ id: "erasing-1" }),
    } as never)
    expect(res.status).toBe(409)
  })

  it("returns 200 with verificationHash and erasureLog on success", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "erasing-1",
        status: "approved",
        targetUserId: "target-1",
        companyId: "company-1",
      },
    ])
    mockDb.returning
      .mockResolvedValueOnce([{ id: "erasing-1" }]) // lock update
      .mockResolvedValueOnce([{ id: "target-1" }]) // users anonymize
      .mockResolvedValueOnce([]) // mfa delete
      .mockResolvedValueOnce([]) // devices delete
      .mockResolvedValueOnce([]) // audit log anonymize

    const { POST } = await import("@/app/api/gdpr/erasure/[id]/execute/route")
    const res = await POST(makeReq("/api/gdpr/erasure/erasing-1/execute"), {
      params: Promise.resolve({ id: "erasing-1" }),
    } as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.verificationHash).toBeDefined()
    expect(Array.isArray(body.erasureLog)).toBe(true)
  })
})
