import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
  RoleSets: { admin: [], management: [] },
}))

vi.mock("@prv/jobs/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
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
  then: (resolve: (val: unknown[]) => void) => resolve([{ n: 0 }]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  aiInsights: {
    id: {},
    companyId: {},
    type: {},
    priority: {},
    status: {},
    title: {},
    summary: {},
    affectedCount: {},
    affectedLabel: {},
    confidenceLabel: {},
    score: {},
    riskLabel: {},
    riskDeadline: {},
    dataSource: {},
    createdAt: {},
    deletedAt: {},
    updatedAt: {},
  },
  insightAffectedStores: {
    id: {},
    insightId: {},
    storeId: {},
    storeName: {},
    statusDot: {},
    metricLabel: {},
    metricValue: {},
    detail: {},
    sortOrder: {},
  },
  insightRecommendations: {
    id: {},
    insightId: {},
    title: {},
    priority: {},
    deadline: {},
    sortOrder: {},
  },
  sysadminAccessSessions: {
    id: {},
    requestedBy: {},
    status: {},
    sessionTokenHash: {},
    startedAt: {},
    expiresAt: {},
    revokedAt: {},
    revokedBy: {},
    updatedAt: {},
  },
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    asc: vi.fn(),
    inArray: vi.fn(),
    desc: vi.fn(),
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
  mockDb.limit.mockReset()
  mockDb.limit.mockResolvedValue([])
  mockDb.set.mockReturnThis()
  mockDb.values.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.returning.mockReset()
  mockDb.returning.mockResolvedValue([{ id: "item-1" }])
  mockDb.leftJoin.mockReturnThis()
}

// ─── PATCH /api/intelligence/[id] ─────────────────────────────────────────────

describe("PATCH /api/intelligence/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 when body has neither status nor priority", async () => {
    const { PATCH } = await import("@/app/api/intelligence/[id]/route")
    const res = await PATCH(makeReq("/api/intelligence/insight-1", "PATCH"), webCtx)
    expect(res.status).toBe(422)
  })

  it("returns 422 for invalid status value", async () => {
    const { PATCH } = await import("@/app/api/intelligence/[id]/route")
    const res = await PATCH(
      makeReq("/api/intelligence/insight-1", "PATCH", {
        json: async () => ({ status: "unknown" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when insight not found", async () => {
    const { PATCH } = await import("@/app/api/intelligence/[id]/route")
    const res = await PATCH(
      makeReq("/api/intelligence/insight-1", "PATCH", {
        json: async () => ({ status: "reviewed" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates insight and returns 200 with id and status", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "insight-1", status: "new" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "insight-1", status: "reviewed" }])
    const { PATCH } = await import("@/app/api/intelligence/[id]/route")
    const res = await PATCH(
      makeReq("/api/intelligence/insight-1", "PATCH", {
        json: async () => ({ status: "reviewed" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe("insight-1")
    expect(body.status).toBe("reviewed")
  })
})

// ─── DELETE /api/intelligence/[id] ────────────────────────────────────────────

describe("DELETE /api/intelligence/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when insight not found", async () => {
    const { DELETE } = await import("@/app/api/intelligence/[id]/route")
    const res = await DELETE(makeReq("/api/intelligence/insight-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes insight and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "insight-1" }])
    const { DELETE } = await import("@/app/api/intelligence/[id]/route")
    const res = await DELETE(makeReq("/api/intelligence/insight-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
  })
})

// ─── POST /api/jit/break-glass ────────────────────────────────────────────────

describe("POST /api/jit/break-glass", () => {
  beforeEach(resetMocks)

  it("returns 422 when justification is too short", async () => {
    const { POST } = await import("@/app/api/jit/break-glass/route")
    const res = await POST(
      makeReq("/api/jit/break-glass", "POST", {
        json: async () => ({ justification: "Too short" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("creates break-glass session and returns 200 with token and sessionId", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "jit-session-1" }])
    const { POST } = await import("@/app/api/jit/break-glass/route")
    const res = await POST(
      makeReq("/api/jit/break-glass", "POST", {
        json: async () => ({
          justification:
            "Production outage affecting all users. Emergency access required to diagnose and fix critical database issue impacting all operations.",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toMatch(/^jit_/)
    expect(body.sessionId).toBe("jit-session-1")
  })
})

// ─── POST /api/jit/revoke ─────────────────────────────────────────────────────

describe("POST /api/jit/revoke", () => {
  beforeEach(resetMocks)

  it("returns 422 when sessionId is not a UUID", async () => {
    const { POST } = await import("@/app/api/jit/revoke/route")
    const res = await POST(
      makeReq("/api/jit/revoke", "POST", {
        json: async () => ({ sessionId: "not-a-uuid" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when session not found or already terminated", async () => {
    mockDb.returning.mockResolvedValueOnce([])
    const { POST } = await import("@/app/api/jit/revoke/route")
    const res = await POST(
      makeReq("/api/jit/revoke", "POST", {
        json: async () => ({ sessionId: "00000000-0000-0000-0000-000000000001" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("revokes session and returns 200 with ok:true", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "00000000-0000-0000-0000-000000000001" }])
    const { POST } = await import("@/app/api/jit/revoke/route")
    const res = await POST(
      makeReq("/api/jit/revoke", "POST", {
        json: async () => ({ sessionId: "00000000-0000-0000-0000-000000000001" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})

// ─── POST /api/jit/start ──────────────────────────────────────────────────────

describe("POST /api/jit/start", () => {
  beforeEach(resetMocks)

  it("returns 422 when sessionId is not a UUID", async () => {
    const { POST } = await import("@/app/api/jit/start/route")
    const res = await POST(
      makeReq("/api/jit/start", "POST", {
        json: async () => ({ sessionId: "not-a-uuid" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when JIT session not found", async () => {
    const { POST } = await import("@/app/api/jit/start/route")
    const res = await POST(
      makeReq("/api/jit/start", "POST", {
        json: async () => ({ sessionId: "00000000-0000-0000-0000-000000000001" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("starts session and returns 200 with token and expiresAt", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "00000000-0000-0000-0000-000000000001",
        status: "approved",
        requestedBy: "user-1",
      },
    ])
    const { POST } = await import("@/app/api/jit/start/route")
    const res = await POST(
      makeReq("/api/jit/start", "POST", {
        json: async () => ({ sessionId: "00000000-0000-0000-0000-000000000001" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toMatch(/^jit_/)
    expect(body.expiresAt).toBeDefined()
  })
})
