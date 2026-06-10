import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
  RoleSets: { admin: [], management: [] },
  hasScope: vi.fn().mockReturnValue(true),
}))

vi.mock("@prv/auth/permission-engine", () => ({
  invalidatePermissionCache: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@prv/jobs", () => ({
  inngest: { send: vi.fn().mockResolvedValue({ ids: ["job-1"] }) },
}))

vi.mock("@prv/ai-engine", () => ({
  createConversation: vi.fn().mockResolvedValue("conv-new"),
  listConversations: vi.fn().mockResolvedValue([]),
  appendMessage: vi.fn().mockResolvedValue(undefined),
  getConversationHistory: vi.fn().mockResolvedValue([]),
  streamChatWithHistory: vi.fn().mockReturnValue(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("Hi"))
        controller.close()
      },
    })
  ),
  titleFromMessage: vi.fn().mockReturnValue("Test Title"),
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
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  roles: {},
  userRoleAssignments: {},
  temporaryAccessGrants: {},
  orders: {},
  orderItems: {},
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
    lt: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    count: vi.fn(),
    inArray: vi.fn(),
    notInArray: vi.fn(),
  }
})

const webCtx = {
  session: {
    companyId: "company-1",
    userId: "user-1",
    sessionId: "session-1",
    role: "admin",
    scopeLevel: 9,
  },
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
  mockDb.onConflictDoUpdate.mockReturnThis()
  mockDb.returning.mockResolvedValue([{ id: "new-1" }])
}

// ─── POST /api/roles/assign ───────────────────────────────────────────────────

describe("POST /api/roles/assign", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/roles/assign/route")
    const res = await POST(makeReq("/api/roles/assign"), webCtx)
    expect(res.status).toBe(422)
  })

  it("returns 404 when role not found", async () => {
    // first limit (role check) returns []
    const { POST } = await import("@/app/api/roles/assign/route")
    const res = await POST(
      makeReq("/api/roles/assign", "POST", {
        json: async () => ({
          userId: "00000000-0000-0000-0000-000000000002",
          roleId: "00000000-0000-0000-0000-000000000003",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("assigns role and returns 201 with assignmentId and roleSlug", async () => {
    // role check returns role, existing assignment check returns []
    mockDb.limit.mockResolvedValueOnce([{ id: "role-1", slug: "manager" }])
    mockDb.limit.mockResolvedValueOnce([])
    mockDb.returning.mockResolvedValueOnce([{ id: "assign-new" }])
    const { POST } = await import("@/app/api/roles/assign/route")
    const res = await POST(
      makeReq("/api/roles/assign", "POST", {
        json: async () => ({
          userId: "00000000-0000-0000-0000-000000000002",
          roleId: "00000000-0000-0000-0000-000000000003",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.roleSlug).toBe("manager")
  })

  it("fires audit log with action roles.assign", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "role-1", slug: "manager" }])
    mockDb.limit.mockResolvedValueOnce([])
    mockDb.returning.mockResolvedValueOnce([{ id: "assign-new" }])
    const { POST } = await import("@/app/api/roles/assign/route")
    await POST(
      makeReq("/api/roles/assign", "POST", {
        json: async () => ({
          userId: "00000000-0000-0000-0000-000000000002",
          roleId: "00000000-0000-0000-0000-000000000003",
        }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "roles.assign" }))
  })
})

// ─── DELETE /api/roles/assignments/[assignmentId] ─────────────────────────────

describe("DELETE /api/roles/assignments/[assignmentId]", () => {
  beforeEach(resetMocks)

  it("returns 404 when assignment not found", async () => {
    const { DELETE } = await import("@/app/api/roles/assignments/[assignmentId]/route")
    const res = await DELETE(makeReq("/api/roles/assignments/assign-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("revokes assignment and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ userId: "user-2", companyId: "company-1" }])
    const { DELETE } = await import("@/app/api/roles/assignments/[assignmentId]/route")
    const res = await DELETE(makeReq("/api/roles/assignments/assign-1", "DELETE"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("fires audit log with action roles.revoke", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ userId: "user-2", companyId: "company-1" }])
    const { DELETE } = await import("@/app/api/roles/assignments/[assignmentId]/route")
    await DELETE(makeReq("/api/roles/assignments/assign-1", "DELETE"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "roles.revoke" }))
  })
})

// ─── POST /api/roles/grants ───────────────────────────────────────────────────

describe("POST /api/roles/grants", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/roles/grants/route")
    const res = await POST(makeReq("/api/roles/grants"), webCtx)
    expect(res.status).toBe(422)
  })

  it("returns 404 when role not found", async () => {
    const { POST } = await import("@/app/api/roles/grants/route")
    const res = await POST(
      makeReq("/api/roles/grants", "POST", {
        json: async () => ({
          userId: "00000000-0000-0000-0000-000000000002",
          roleId: "00000000-0000-0000-0000-000000000003",
          reason: "Temporary escalation for incident response",
          durationMinutes: 60,
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("creates grant and returns 201 with grantId and expiresAt", async () => {
    const { inngest } = await import("@prv/jobs")
    vi.mocked(inngest.send).mockResolvedValueOnce({ ids: ["job-1"] })
    mockDb.limit.mockResolvedValueOnce([{ id: "role-1", slug: "sysadmin" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "grant-new" }])
    const { POST } = await import("@/app/api/roles/grants/route")
    const res = await POST(
      makeReq("/api/roles/grants", "POST", {
        json: async () => ({
          userId: "00000000-0000-0000-0000-000000000002",
          roleId: "00000000-0000-0000-0000-000000000003",
          reason: "Temporary escalation for incident response",
          durationMinutes: 60,
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.grantId).toBe("grant-new")
    expect(body.expiresAt).toBeDefined()
  })

  it("fires audit log with action roles.grants.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { inngest } = await import("@prv/jobs")
    vi.mocked(inngest.send).mockResolvedValueOnce({ ids: ["job-1"] })
    mockDb.limit.mockResolvedValueOnce([{ id: "role-1", slug: "sysadmin" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "grant-new" }])
    const { POST } = await import("@/app/api/roles/grants/route")
    await POST(
      makeReq("/api/roles/grants", "POST", {
        json: async () => ({
          userId: "00000000-0000-0000-0000-000000000002",
          roleId: "00000000-0000-0000-0000-000000000003",
          reason: "Temporary escalation for incident response",
          durationMinutes: 30,
        }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "roles.grants.create" })
    )
  })
})

// ─── DELETE /api/roles/grants/[grantId] ──────────────────────────────────────

describe("DELETE /api/roles/grants/[grantId]", () => {
  beforeEach(resetMocks)

  it("returns 404 when active grant not found", async () => {
    const { DELETE } = await import("@/app/api/roles/grants/[grantId]/route")
    const res = await DELETE(makeReq("/api/roles/grants/grant-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("revokes grant and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ userId: "user-2", status: "active" }])
    const { DELETE } = await import("@/app/api/roles/grants/[grantId]/route")
    const res = await DELETE(makeReq("/api/roles/grants/grant-1", "DELETE"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("fires audit log with action roles.grants.revoke", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ userId: "user-2", status: "active" }])
    const { DELETE } = await import("@/app/api/roles/grants/[grantId]/route")
    await DELETE(makeReq("/api/roles/grants/grant-1", "DELETE"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "roles.grants.revoke" })
    )
  })
})

// ─── POST /api/intelligence/conversations ────────────────────────────────────

describe("POST /api/intelligence/conversations", () => {
  beforeEach(resetMocks)

  it("creates conversation and returns 201 with id", async () => {
    const { createConversation } = await import("@prv/ai-engine")
    vi.mocked(createConversation).mockResolvedValueOnce("conv-new")
    const { POST } = await import("@/app/api/intelligence/conversations/route")
    const res = await POST(makeReq("/api/intelligence/conversations"), webCtx)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("conv-new")
  })
})

// ─── POST /api/intelligence/chat ─────────────────────────────────────────────

describe("POST /api/intelligence/chat", () => {
  beforeEach(resetMocks)

  it("returns 400 for missing message", async () => {
    const { POST } = await import("@/app/api/intelligence/chat/route")
    const res = await POST(makeReq("/api/intelligence/chat"), webCtx)
    expect(res.status).toBe(400)
  })

  it("returns streaming response with X-Conversation-Id header", async () => {
    const { createConversation } = await import("@prv/ai-engine")
    vi.mocked(createConversation).mockResolvedValueOnce("conv-stream")
    const { POST } = await import("@/app/api/intelligence/chat/route")
    const res = await POST(
      makeReq("/api/intelligence/chat", "POST", {
        json: async () => ({ message: "Hello, what can you help with?" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    expect(res.headers.get("X-Conversation-Id")).toBe("conv-stream")
  })
})

// ─── POST /api/shop/orders ────────────────────────────────────────────────────

describe("POST /api/shop/orders", () => {
  beforeEach(resetMocks)

  it("creates order and returns 201 with order object", async () => {
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "ord-new",
        orderNumber: "CMD-123",
        status: "pending",
        subtotal: "100",
        vatAmount: "19",
        total: "119",
        shippingAddress: {},
        notes: null,
        clientId: null,
        createdAt: new Date(),
      },
    ])
    const { POST } = await import("@/app/api/shop/orders/route")
    const res = await POST(
      makeReq("/api/shop/orders", "POST", {
        json: async () => ({
          items: [{ productName: "Widget", qty: 1, unitPrice: 100 }],
          deliveryAddress: "123 Main St",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.order.id).toBe("ord-new")
  })

  it("fires audit log with action shop.orders.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "ord-new",
        orderNumber: "CMD-123",
        status: "pending",
        subtotal: "0",
        vatAmount: "0",
        total: "0",
        shippingAddress: {},
        notes: null,
        clientId: null,
        createdAt: new Date(),
      },
    ])
    const { POST } = await import("@/app/api/shop/orders/route")
    await POST(
      makeReq("/api/shop/orders", "POST", {
        json: async () => ({ items: [] }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "shop.orders.create" })
    )
  })
})
