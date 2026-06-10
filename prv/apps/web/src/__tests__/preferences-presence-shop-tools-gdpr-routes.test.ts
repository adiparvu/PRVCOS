import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
  RoleSets: { admin: [], management: [] },
}))

vi.mock("@prv/search", () => ({
  upsertDocument: vi.fn().mockResolvedValue(undefined),
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "new-1", name: "Test" }]),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  userPreferences: { userId: {} },
  DEFAULT_APPEARANCE: { theme: "dark", glassStyle: "translucid", syncEnabled: true },
  userPresence: { userId: {}, companyId: {} },
  products: {},
  tools: {},
  users: {},
  stores: {},
  auditLogs: {},
  dataErasureRequests: {},
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    desc: vi.fn(),
    asc: vi.fn(),
    gt: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    lt: vi.fn(),
    count: vi.fn(),
    inArray: vi.fn(),
    notInArray: vi.fn(),
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
    nextUrl: { pathname: path, searchParams: new URLSearchParams() },
    url: `http://localhost${path}`,
    headers: { get: () => null },
    json: async () => ({}),
    ...overrides,
  } as unknown as Request
}

function resetMocks() {
  vi.resetAllMocks()
  mockDb.select.mockReturnThis()
  mockDb.insert.mockReturnThis()
  mockDb.update.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockResolvedValue([])
  mockDb.values.mockReturnThis()
  mockDb.set.mockReturnThis()
  mockDb.innerJoin.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.onConflictDoUpdate.mockReturnThis()
  mockDb.returning.mockResolvedValue([{ id: "new-1", name: "Test" }])
}

// ─── PATCH /api/preferences ───────────────────────────────────────────────────

describe("PATCH /api/preferences", () => {
  beforeEach(resetMocks)

  it("returns 400 when no fields to update", async () => {
    const { PATCH } = await import("@/app/api/preferences/route")
    const res = await PATCH(
      makeReq("/api/preferences", "PATCH", {
        json: async () => ({}),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("updates preferences and returns 200 ok", async () => {
    const { PATCH } = await import("@/app/api/preferences/route")
    const res = await PATCH(
      makeReq("/api/preferences", "PATCH", {
        json: async () => ({ theme: "dark" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("fires audit log with action user.preferences.update", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { PATCH } = await import("@/app/api/preferences/route")
    await PATCH(
      makeReq("/api/preferences", "PATCH", {
        json: async () => ({ theme: "system" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.preferences.update" })
    )
  })
})

// ─── POST /api/presence ───────────────────────────────────────────────────────

describe("POST /api/presence", () => {
  beforeEach(resetMocks)

  it("upserts presence and returns 200 ok", async () => {
    const { POST } = await import("@/app/api/presence/route")
    const res = await POST(
      makeReq("/api/presence", "POST", {
        json: async () => ({ status: "online" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("returns 200 with defaults when body is empty", async () => {
    const { POST } = await import("@/app/api/presence/route")
    const res = await POST(
      makeReq("/api/presence", "POST", {
        json: async () => ({}),
      }),
      webCtx
    )
    // schema has defaults so empty body is valid
    expect(res.status).toBe(200)
  })
})

// ─── PATCH /api/shop/products/[id] ───────────────────────────────────────────

describe("PATCH /api/shop/products/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for empty patch body", async () => {
    const { PATCH } = await import("@/app/api/shop/products/[id]/route")
    const res = await PATCH(
      makeReq("/api/shop/products/prod-1", "PATCH", {
        json: async () => ({}),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when product not found", async () => {
    // limit returns [] by default
    const { PATCH } = await import("@/app/api/shop/products/[id]/route")
    const res = await PATCH(
      makeReq("/api/shop/products/prod-1", "PATCH", {
        json: async () => ({ isActive: false }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates product and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "prod-1", name: "Widget" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "prod-1", name: "Widget", isActive: false }])
    const { PATCH } = await import("@/app/api/shop/products/[id]/route")
    const res = await PATCH(
      makeReq("/api/shop/products/prod-1", "PATCH", {
        json: async () => ({ isActive: false }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
  })

  it("fires audit log with action shop.products.update", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "prod-1", name: "Widget" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "prod-1", name: "Widget", isActive: false }])
    const { PATCH } = await import("@/app/api/shop/products/[id]/route")
    await PATCH(
      makeReq("/api/shop/products/prod-1", "PATCH", {
        json: async () => ({ isActive: false }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "shop.products.update" })
    )
  })
})

// ─── DELETE /api/shop/products/[id] ──────────────────────────────────────────

describe("DELETE /api/shop/products/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when product not found", async () => {
    const { DELETE } = await import("@/app/api/shop/products/[id]/route")
    const res = await DELETE(makeReq("/api/shop/products/prod-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes product and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "prod-1", name: "Widget" }])
    const { DELETE } = await import("@/app/api/shop/products/[id]/route")
    const res = await DELETE(makeReq("/api/shop/products/prod-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action shop.products.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "prod-1", name: "Widget" }])
    const { DELETE } = await import("@/app/api/shop/products/[id]/route")
    await DELETE(makeReq("/api/shop/products/prod-1", "DELETE"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "shop.products.delete" })
    )
  })
})

// ─── POST /api/tools ──────────────────────────────────────────────────────────

describe("POST /api/tools", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required name", async () => {
    const { POST } = await import("@/app/api/tools/route")
    const res = await POST(makeReq("/api/tools"), webCtx)
    expect(res.status).toBe(422)
  })

  it("creates tool and returns 201 with id and name", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "tool-new", name: "Drill" }])
    const { POST } = await import("@/app/api/tools/route")
    const res = await POST(
      makeReq("/api/tools", "POST", {
        json: async () => ({ name: "Drill", brand: "Bosch" }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("tool-new")
    expect(body.name).toBe("Drill")
  })

  it("fires audit log with action tools.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "tool-new", name: "Drill" }])
    const { POST } = await import("@/app/api/tools/route")
    await POST(
      makeReq("/api/tools", "POST", {
        json: async () => ({ name: "Drill" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "tools.create" }))
  })
})

// ─── PATCH /api/tools/[id] ────────────────────────────────────────────────────

describe("PATCH /api/tools/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when tool not found", async () => {
    const { PATCH } = await import("@/app/api/tools/[id]/route")
    const res = await PATCH(
      makeReq("/api/tools/tool-1", "PATCH", {
        json: async () => ({ status: "available" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates tool and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "tool-1", name: "Drill", status: "in_use" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "tool-1", status: "available" }])
    const { PATCH } = await import("@/app/api/tools/[id]/route")
    const res = await PATCH(
      makeReq("/api/tools/tool-1", "PATCH", {
        json: async () => ({ status: "available" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
  })

  it("fires audit log with action tools.update", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "tool-1", name: "Drill", status: "available" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "tool-1", status: "maintenance" }])
    const { PATCH } = await import("@/app/api/tools/[id]/route")
    await PATCH(
      makeReq("/api/tools/tool-1", "PATCH", {
        json: async () => ({ status: "maintenance" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "tools.update" }))
  })
})

// ─── POST /api/gdpr/erasure ───────────────────────────────────────────────────

describe("POST /api/gdpr/erasure", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/gdpr/erasure/route")
    const res = await POST(makeReq("/api/gdpr/erasure"), webCtx)
    expect(res.status).toBe(422)
  })

  it("creates erasure request and returns 201 with id and status", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "erasure-new", status: "pending" }])
    const { POST } = await import("@/app/api/gdpr/erasure/route")
    const res = await POST(
      makeReq("/api/gdpr/erasure", "POST", {
        json: async () => ({
          targetUserId: "00000000-0000-0000-0000-000000000099",
          requestReason: "User requested full account deletion per GDPR right to erasure.",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("erasure-new")
    expect(body.status).toBe("pending")
  })

  it("fires audit log with action gdpr.erasure.request", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "erasure-new", status: "pending" }])
    const { POST } = await import("@/app/api/gdpr/erasure/route")
    await POST(
      makeReq("/api/gdpr/erasure", "POST", {
        json: async () => ({
          targetUserId: "00000000-0000-0000-0000-000000000099",
          requestReason: "User requested full account deletion per GDPR right to erasure.",
        }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "gdpr.erasure.request" })
    )
  })
})
