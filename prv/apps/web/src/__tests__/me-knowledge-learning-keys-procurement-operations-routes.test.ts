import { describe, it, expect, vi, beforeEach } from "vitest"

// Custom withGates mock: wraps handler so makeHandler routes also receive ctx.
// Regular routes: HANDLER(req, ctx) => handler(req, ctx)
// makeHandler routes: HANDLER(req, { params }) calls withGates(config, inner)(req)
//   → inner(req, defaultCtx) where params captured from outer closure.
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
  RoleSets: { admin: [], management: [] },
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
  returning: vi.fn().mockResolvedValue([{ id: "new-1" }]),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  then: (resolve: (val: unknown[]) => void) => resolve([]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  users: {
    id: {},
    firstName: {},
    lastName: {},
    companyId: {},
    isActive: {},
    deletedAt: {},
    email: {},
    phone: {},
    jobTitle: {},
    avatarUrl: {},
    bio: {},
    role: {},
    locale: {},
    timezone: {},
    mfaEnabled: {},
    securityLevel: {},
    createdAt: {},
    updatedAt: {},
  },
  knowledgeArticles: {
    id: {},
    title: {},
    companyId: {},
    authorUserId: {},
    deletedAt: {},
    type: {},
    category: {},
    version: {},
    isPinned: {},
    readMinutes: {},
    views: {},
    updatedAt: {},
  },
  articleReadProgress: {
    articleId: {},
    userId: {},
    progressPct: {},
    companyId: {},
  },
  learningCourses: {
    id: {},
    title: {},
    subtitle: {},
    companyId: {},
    instructorUserId: {},
    deletedAt: {},
    isActive: {},
    category: {},
    totalModules: {},
    durationMinutes: {},
    hasCert: {},
    isFeatured: {},
    rating: {},
    reviewCount: {},
    updatedAt: {},
  },
  courseEnrollments: {
    id: {},
    courseId: {},
    userId: {},
    companyId: {},
    status: {},
    progressPct: {},
    currentModule: {},
    updatedAt: {},
    completedAt: {},
  },
  userAchievements: {
    id: {},
    companyId: {},
    userId: {},
    label: {},
    detail: {},
    colorType: {},
    achievedAt: {},
  },
  apiKeys: {
    id: {},
    userId: {},
    companyId: {},
    name: {},
    keyHash: {},
    keyPrefix: {},
    scopes: {},
    expiresAt: {},
    isActive: {},
    revokedAt: {},
    lastUsedAt: {},
    createdAt: {},
    updatedAt: {},
  },
  purchaseOrders: {
    id: {},
    companyId: {},
    ref: {},
    description: {},
    supplierName: {},
    supplierId: {},
    date: {},
    neededBy: {},
    amount: {},
    status: {},
    notes: {},
    deletedAt: {},
    createdAt: {},
    projectId: {},
    createdByUserId: {},
    updatedAt: {},
  },
  suppliers: { id: {}, name: {}, companyId: {} },
  projects: { id: {}, name: {}, companyId: {} },
  stores: {
    id: {},
    name: {},
    companyId: {},
    city: {},
    address: {},
    phone: {},
    email: {},
    isActive: {},
    region: {},
    updatedAt: {},
  },
  orders: { id: {}, storeId: {}, total: {}, createdAt: {}, deletedAt: {} },
  tasks: { id: {}, storeId: {}, companyId: {}, status: {} },
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    or: vi.fn(),
    desc: vi.fn(),
    asc: vi.fn(),
    gt: vi.fn(),
    lt: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    ne: vi.fn(),
    count: vi.fn(),
    sum: vi.fn(),
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
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockResolvedValue([])
  mockDb.values.mockReturnThis()
  mockDb.set.mockReturnThis()
  mockDb.innerJoin.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.returning.mockResolvedValue([{ id: "new-1" }])
  mockDb.onConflictDoUpdate.mockReturnThis()
}

// ─── PATCH /api/me ────────────────────────────────────────────────────────────

describe("PATCH /api/me", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid payload", async () => {
    const { PATCH } = await import("@/app/api/me/route")
    const res = await PATCH(
      makeReq("/api/me", "PATCH", { json: async () => ({ firstName: "" }) }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 400 when body has no fields to update", async () => {
    const { PATCH } = await import("@/app/api/me/route")
    const res = await PATCH(makeReq("/api/me", "PATCH", { json: async () => ({}) }), webCtx)
    expect(res.status).toBe(400)
  })

  it("updates profile and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { PATCH } = await import("@/app/api/me/route")
    const res = await PATCH(
      makeReq("/api/me", "PATCH", { json: async () => ({ firstName: "John" }) }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "user.profile.update" })
    )
  })
})

// ─── POST /api/knowledge ─────────────────────────────────────────────────────

describe("POST /api/knowledge", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing title", async () => {
    const { POST } = await import("@/app/api/knowledge/route")
    const res = await POST(makeReq("/api/knowledge", "POST", { json: async () => ({}) }), webCtx)
    expect(res.status).toBe(422)
  })

  it("creates article and returns 201", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "article-new", title: "Test Article" }])
    const { POST } = await import("@/app/api/knowledge/route")
    const res = await POST(
      makeReq("/api/knowledge", "POST", { json: async () => ({ title: "Test Article" }) }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("article-new")
  })
})

// ─── PATCH /api/knowledge/[id] ───────────────────────────────────────────────

describe("PATCH /api/knowledge/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 when body has no fields (refine fails)", async () => {
    const { PATCH } = await import("@/app/api/knowledge/[id]/route")
    const res = await PATCH(makeReq("/api/knowledge/article-1", "PATCH"), webCtx)
    expect(res.status).toBe(422)
  })

  it("returns 404 when article not found", async () => {
    const { PATCH } = await import("@/app/api/knowledge/[id]/route")
    const res = await PATCH(
      makeReq("/api/knowledge/article-1", "PATCH", { json: async () => ({ title: "Updated" }) }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates article and returns 200 with audit log", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "article-1", title: "Old Title" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "article-1", isPinned: false }])
    const { writeAuditLog } = await import("@prv/auth")
    const { PATCH } = await import("@/app/api/knowledge/[id]/route")
    const res = await PATCH(
      makeReq("/api/knowledge/article-1", "PATCH", { json: async () => ({ title: "Updated" }) }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe("article-1")
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "knowledge.update" })
    )
  })
})

// ─── DELETE /api/knowledge/[id] ──────────────────────────────────────────────

describe("DELETE /api/knowledge/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when article not found", async () => {
    const { DELETE } = await import("@/app/api/knowledge/[id]/route")
    const res = await DELETE(makeReq("/api/knowledge/article-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes article and returns 204 with audit log", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "article-1", title: "Test" }])
    const { writeAuditLog } = await import("@prv/auth")
    const { DELETE } = await import("@/app/api/knowledge/[id]/route")
    const res = await DELETE(makeReq("/api/knowledge/article-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "knowledge.delete" })
    )
  })
})

// ─── POST /api/learning ──────────────────────────────────────────────────────

describe("POST /api/learning", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing title", async () => {
    const { POST } = await import("@/app/api/learning/route")
    const res = await POST(makeReq("/api/learning", "POST", { json: async () => ({}) }), webCtx)
    expect(res.status).toBe(422)
  })

  it("creates course and returns 201", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "course-new", title: "Test Course" }])
    const { POST } = await import("@/app/api/learning/route")
    const res = await POST(
      makeReq("/api/learning", "POST", { json: async () => ({ title: "Test Course" }) }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("course-new")
  })
})

// ─── PATCH /api/learning/[id] ────────────────────────────────────────────────

describe("PATCH /api/learning/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid action", async () => {
    const { PATCH } = await import("@/app/api/learning/[id]/route")
    const res = await PATCH(
      makeReq("/api/learning/course-1", "PATCH", {
        json: async () => ({ action: "invalid_action" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when course not found", async () => {
    const { PATCH } = await import("@/app/api/learning/[id]/route")
    const res = await PATCH(
      makeReq("/api/learning/course-1", "PATCH", { json: async () => ({ action: "enroll" }) }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("enrolls user in new course and returns 200", async () => {
    mockDb.limit
      .mockResolvedValueOnce([{ id: "course-1", title: "Test Course" }])
      .mockResolvedValueOnce([]) // no existing enrollment → insert
    const { PATCH } = await import("@/app/api/learning/[id]/route")
    const res = await PATCH(
      makeReq("/api/learning/course-1", "PATCH", { json: async () => ({ action: "enroll" }) }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("in_progress")
  })
})

// ─── DELETE /api/learning/[id] ───────────────────────────────────────────────

describe("DELETE /api/learning/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when course not found", async () => {
    const { DELETE } = await import("@/app/api/learning/[id]/route")
    const res = await DELETE(makeReq("/api/learning/course-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes course and returns 204 with audit log", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "course-1", title: "Test Course" }])
    const { writeAuditLog } = await import("@prv/auth")
    const { DELETE } = await import("@/app/api/learning/[id]/route")
    const res = await DELETE(makeReq("/api/learning/course-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "learning.delete" })
    )
  })
})

// ─── POST /api/keys ──────────────────────────────────────────────────────────

describe("POST /api/keys", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid payload", async () => {
    const { POST } = await import("@/app/api/keys/route")
    const res = await POST(makeReq("/api/keys", "POST", { json: async () => ({}) }), webCtx)
    expect(res.status).toBe(422)
  })

  it("creates API key and returns 201 with raw key", async () => {
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "key-new",
        name: "My Key",
        keyPrefix: "prv_12345678",
        scopes: ["read"],
        expiresAt: null,
        createdAt: new Date(),
      },
    ])
    const { POST } = await import("@/app/api/keys/route")
    const res = await POST(
      makeReq("/api/keys", "POST", {
        json: async () => ({ name: "My Key", scopes: ["read"] }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("key-new")
    expect(body.key).toMatch(/^prv_/)
  })
})

// ─── PATCH /api/keys/[id] ────────────────────────────────────────────────────
// Uses makeHandler wrapper — second arg must be { params: Promise<{ id }> }

describe("PATCH /api/keys/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 when body has no fields (refine fails)", async () => {
    const { PATCH } = await import("@/app/api/keys/[id]/route")
    const res = await PATCH(
      makeReq("/api/keys/key-1", "PATCH") as any,
      { params: Promise.resolve({ id: "key-1" }) } as any
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when key not found or revoked", async () => {
    const { PATCH } = await import("@/app/api/keys/[id]/route")
    const res = await PATCH(
      makeReq("/api/keys/key-1", "PATCH", { json: async () => ({ name: "Updated" }) }) as any,
      { params: Promise.resolve({ id: "key-1" }) } as any
    )
    expect(res.status).toBe(404)
  })

  it("updates API key and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "key-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "key-1", name: "Updated" }])
    const { PATCH } = await import("@/app/api/keys/[id]/route")
    const res = await PATCH(
      makeReq("/api/keys/key-1", "PATCH", { json: async () => ({ name: "Updated" }) }) as any,
      { params: Promise.resolve({ id: "key-1" }) } as any
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe("key-1")
  })
})

// ─── DELETE /api/keys/[id] ───────────────────────────────────────────────────

describe("DELETE /api/keys/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when key not found or already revoked", async () => {
    mockDb.returning.mockResolvedValueOnce([])
    const { DELETE } = await import("@/app/api/keys/[id]/route")
    const res = await DELETE(
      makeReq("/api/keys/key-1", "DELETE") as any,
      { params: Promise.resolve({ id: "key-1" }) } as any
    )
    expect(res.status).toBe(404)
  })

  it("revokes key and returns 200", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "key-1" }])
    const { DELETE } = await import("@/app/api/keys/[id]/route")
    const res = await DELETE(
      makeReq("/api/keys/key-1", "DELETE") as any,
      { params: Promise.resolve({ id: "key-1" }) } as any
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})

// ─── POST /api/procurement ───────────────────────────────────────────────────

describe("POST /api/procurement", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/procurement/route")
    const res = await POST(
      makeReq("/api/procurement", "POST", { json: async () => ({ ref: "PO-001" }) }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("creates purchase order and returns 201", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "po-new", ref: "PO-001" }])
    const { POST } = await import("@/app/api/procurement/route")
    const res = await POST(
      makeReq("/api/procurement", "POST", {
        json: async () => ({
          ref: "PO-001",
          description: "Test order",
          date: "2024-01-01",
          amount: 1000,
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("po-new")
    expect(body.ref).toBe("PO-001")
  })
})

// ─── PATCH /api/procurement/[id] ─────────────────────────────────────────────

describe("PATCH /api/procurement/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid action", async () => {
    const { PATCH } = await import("@/app/api/procurement/[id]/route")
    const res = await PATCH(
      makeReq("/api/procurement/po-1", "PATCH", { json: async () => ({}) }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when PO not found", async () => {
    const { PATCH } = await import("@/app/api/procurement/[id]/route")
    const res = await PATCH(
      makeReq("/api/procurement/po-1", "PATCH", { json: async () => ({ action: "submit" }) }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 409 for invalid status transition", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "po-1", status: "approved", ref: "PO-001" }])
    const { PATCH } = await import("@/app/api/procurement/[id]/route")
    const res = await PATCH(
      makeReq("/api/procurement/po-1", "PATCH", { json: async () => ({ action: "submit" }) }),
      webCtx
    )
    expect(res.status).toBe(409)
  })

  it("transitions PO status and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "po-1", status: "draft", ref: "PO-001" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "po-1", status: "pending" }])
    const { PATCH } = await import("@/app/api/procurement/[id]/route")
    const res = await PATCH(
      makeReq("/api/procurement/po-1", "PATCH", { json: async () => ({ action: "submit" }) }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("pending")
  })
})

// ─── DELETE /api/procurement/[id] ────────────────────────────────────────────

describe("DELETE /api/procurement/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when PO not found", async () => {
    const { DELETE } = await import("@/app/api/procurement/[id]/route")
    const res = await DELETE(makeReq("/api/procurement/po-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("returns 409 when PO is not in a deletable status", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "po-1", status: "approved", ref: "PO-001" }])
    const { DELETE } = await import("@/app/api/procurement/[id]/route")
    const res = await DELETE(makeReq("/api/procurement/po-1", "DELETE"), webCtx)
    expect(res.status).toBe(409)
  })

  it("soft-deletes draft PO and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "po-1", status: "draft", ref: "PO-001" }])
    const { DELETE } = await import("@/app/api/procurement/[id]/route")
    const res = await DELETE(makeReq("/api/procurement/po-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
  })
})

// ─── PATCH /api/operations/[id] ──────────────────────────────────────────────

describe("PATCH /api/operations/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 when body has no fields (refine fails)", async () => {
    const { PATCH } = await import("@/app/api/operations/[id]/route")
    const res = await PATCH(makeReq("/api/operations/store-1", "PATCH"), webCtx)
    expect(res.status).toBe(422)
  })

  it("returns 404 when store not found", async () => {
    const { PATCH } = await import("@/app/api/operations/[id]/route")
    const res = await PATCH(
      makeReq("/api/operations/store-1", "PATCH", { json: async () => ({ name: "Store X" }) }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates store and returns 200 with audit log", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "store-1", name: "Old Name" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "store-1", name: "Store X" }])
    const { writeAuditLog } = await import("@prv/auth")
    const { PATCH } = await import("@/app/api/operations/[id]/route")
    const res = await PATCH(
      makeReq("/api/operations/store-1", "PATCH", { json: async () => ({ name: "Store X" }) }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe("store-1")
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "operations.update" })
    )
  })
})

// ─── DELETE /api/operations/[id] ─────────────────────────────────────────────

describe("DELETE /api/operations/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when store not found", async () => {
    const { DELETE } = await import("@/app/api/operations/[id]/route")
    const res = await DELETE(makeReq("/api/operations/store-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("deactivates store and returns 204 with audit log", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "store-1", name: "Store X", isActive: true }])
    const { writeAuditLog } = await import("@prv/auth")
    const { DELETE } = await import("@/app/api/operations/[id]/route")
    const res = await DELETE(makeReq("/api/operations/store-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "operations.delete" })
    )
  })
})
