import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/mobile/auth", () => ({
  withMobileAuth: (handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
  revokeSession: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@prv/cache", () => ({
  getRedis: vi.fn(() => mockRedis),
  cacheKey: { session: vi.fn((id: string) => `session:${id}`) },
}))

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock("@prv/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

const mockRedis = {
  get: vi.fn().mockResolvedValue({ userId: "user-1" }),
}

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
  then: (resolve: (val: unknown[]) => void) => resolve([]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  expenses: { id: {}, companyId: {}, status: {}, deletedAt: {}, submittedById: {}, updatedAt: {} },
  invoices: {
    id: {},
    companyId: {},
    status: {},
    deletedAt: {},
    invoiceNumber: {},
    issueDate: {},
    dueDate: {},
    currency: {},
    notes: {},
    reference: {},
    clientId: {},
    projectId: {},
    updatedAt: {},
    createdAt: {},
  },
  invoiceItems: { id: {}, invoiceId: {}, name: {}, qty: {}, unitPrice: {}, vatRate: {} },
  orders: {
    id: {},
    companyId: {},
    status: {},
    deletedAt: {},
    orderNumber: {},
    clientId: {},
    storeId: {},
    currency: {},
    notes: {},
    updatedAt: {},
    createdAt: {},
  },
  orderItems: { id: {}, orderId: {}, name: {}, qty: {}, unitPrice: {}, vatRate: {} },
  projects: {
    id: {},
    companyId: {},
    status: {},
    deletedAt: {},
    name: {},
    clientId: {},
    storeId: {},
    updatedAt: {},
    createdAt: {},
  },
  projectMembers: { id: {}, projectId: {}, userId: {} },
  projectMilestones: { id: {}, projectId: {} },
  notifications: { id: {}, userId: {} },
  clients: { id: {}, companyId: {}, name: {}, type: {}, status: {}, isActive: {} },
  users: { id: {}, companyId: {}, email: {}, firstName: {}, lastName: {}, updatedAt: {} },
  stores: { id: {}, name: {} },
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    notInArray: vi.fn(),
    inArray: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    desc: vi.fn(),
    asc: vi.fn(),
    count: vi.fn(),
    sum: vi.fn(),
    sql: vi.fn(),
  }
})

const mobileCtx = {
  userId: "user-1",
  companyId: "company-1",
  sessionId: "session-1",
  role: "store_manager" as const,
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
  mockRedis.get.mockResolvedValue({ userId: "user-1" })
}

// ─── PATCH /api/mobile/profile/patch ─────────────────────────────────────────

describe("PATCH /api/mobile/profile/patch", () => {
  beforeEach(resetMocks)

  it("returns 400 for empty body", async () => {
    const { PATCH } = await import("@/app/api/mobile/profile/patch/route")
    const res = await PATCH(makeReq("/api/mobile/profile/patch", "PATCH"), mobileCtx)
    expect(res.status).toBe(400)
  })

  it("updates profile and returns 200 with success:true", async () => {
    const { PATCH } = await import("@/app/api/mobile/profile/patch/route")
    const res = await PATCH(
      makeReq("/api/mobile/profile/patch", "PATCH", {
        json: async () => ({ firstName: "Jane", lastName: "Doe" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ─── DELETE /api/mobile/security/sessions/[id] ───────────────────────────────

describe("DELETE /api/mobile/security/sessions/[id]", () => {
  beforeEach(resetMocks)

  it("returns 400 when attempting to revoke current session", async () => {
    const { DELETE } = await import("@/app/api/mobile/security/sessions/[id]/route")
    const res = await DELETE(
      makeReq("/api/mobile/security/sessions/session-1", "DELETE"),
      mobileCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 404 when target session not found in redis", async () => {
    mockRedis.get.mockResolvedValueOnce(null)
    const { DELETE } = await import("@/app/api/mobile/security/sessions/[id]/route")
    const res = await DELETE(
      makeReq("/api/mobile/security/sessions/session-other", "DELETE"),
      mobileCtx
    )
    expect(res.status).toBe(404)
  })

  it("revokes session and returns 200 with success:true", async () => {
    mockRedis.get.mockResolvedValueOnce({ userId: "user-1" })
    const { DELETE } = await import("@/app/api/mobile/security/sessions/[id]/route")
    const res = await DELETE(
      makeReq("/api/mobile/security/sessions/session-other", "DELETE"),
      mobileCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ─── POST /api/mobile/clients ─────────────────────────────────────────────────

describe("POST /api/mobile/clients", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing name", async () => {
    const { POST } = await import("@/app/api/mobile/clients/route")
    const res = await POST(makeReq("/api/mobile/clients"), mobileCtx)
    expect(res.status).toBe(422)
  })

  it("creates client and returns 201 with id", async () => {
    mockDb.returning.mockResolvedValueOnce([
      { id: "client-1", name: "Acme Corp", type: "business", status: "active" },
    ])
    const { POST } = await import("@/app/api/mobile/clients/route")
    const res = await POST(
      makeReq("/api/mobile/clients", "POST", {
        json: async () => ({ name: "Acme Corp" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("client-1")
  })
})

// ─── POST /api/mobile/employees ──────────────────────────────────────────────

describe("POST /api/mobile/employees schema validation", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing firstName", async () => {
    const { POST } = await import("@/app/api/mobile/employees/route")
    const res = await POST(
      makeReq("/api/mobile/employees", "POST", {
        json: async () => ({ lastName: "Doe", email: "john@example.com" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 422 for invalid email", async () => {
    const { POST } = await import("@/app/api/mobile/employees/route")
    const res = await POST(
      makeReq("/api/mobile/employees", "POST", {
        json: async () => ({ firstName: "John", lastName: "Doe", email: "not-an-email" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })
})

// ─── POST /api/mobile/expenses ────────────────────────────────────────────────

describe("POST /api/mobile/expenses", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/mobile/expenses/route")
    const res = await POST(makeReq("/api/mobile/expenses"), mobileCtx)
    expect(res.status).toBe(422)
  })

  it("creates expense and returns 201 with id", async () => {
    mockDb.returning.mockResolvedValueOnce([
      { id: "exp-1", title: "Office Supplies", status: "draft" },
    ])
    const { POST } = await import("@/app/api/mobile/expenses/route")
    const res = await POST(
      makeReq("/api/mobile/expenses", "POST", {
        json: async () => ({ title: "Office Supplies", amount: 150, date: "2026-06-01" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("exp-1")
  })
})

// ─── PATCH /api/mobile/expenses/[id] ─────────────────────────────────────────

describe("PATCH /api/mobile/expenses/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid status", async () => {
    const { PATCH } = await import("@/app/api/mobile/expenses/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/expenses/exp-1", "PATCH", {
        json: async () => ({ status: "deleted" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when expense not found", async () => {
    const { PATCH } = await import("@/app/api/mobile/expenses/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/expenses/exp-1", "PATCH", {
        json: async () => ({ status: "submitted" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates status and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "exp-1", status: "draft" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "exp-1", status: "submitted" }])
    const { PATCH } = await import("@/app/api/mobile/expenses/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/expenses/exp-1", "PATCH", {
        json: async () => ({ status: "submitted" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("submitted")
  })
})

// ─── DELETE /api/mobile/expenses/[id] ────────────────────────────────────────

describe("DELETE /api/mobile/expenses/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when expense not found", async () => {
    const { DELETE } = await import("@/app/api/mobile/expenses/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/expenses/exp-1", "DELETE"), mobileCtx)
    expect(res.status).toBe(404)
  })

  it("returns 409 when expense status is not deletable", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "exp-1", status: "approved" }])
    const { DELETE } = await import("@/app/api/mobile/expenses/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/expenses/exp-1", "DELETE"), mobileCtx)
    expect(res.status).toBe(409)
  })

  it("soft-deletes and returns 204 for draft expense", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "exp-1", status: "draft" }])
    const { DELETE } = await import("@/app/api/mobile/expenses/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/expenses/exp-1", "DELETE"), mobileCtx)
    expect(res.status).toBe(204)
  })
})

// ─── POST /api/mobile/invoices ────────────────────────────────────────────────

describe("POST /api/mobile/invoices", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/mobile/invoices/route")
    const res = await POST(makeReq("/api/mobile/invoices"), mobileCtx)
    expect(res.status).toBe(422)
  })

  it("creates invoice and returns 201", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "inv-1", invoiceNumber: "INV-0001" }])
    const { POST } = await import("@/app/api/mobile/invoices/route")
    const res = await POST(
      makeReq("/api/mobile/invoices", "POST", {
        json: async () => ({
          issueDate: "2026-06-01",
          dueDate: "2026-07-01",
          items: [{ name: "Service", qty: 1, unitPrice: 1000 }],
        }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("inv-1")
  })
})

// ─── PATCH /api/mobile/invoices/[id] ─────────────────────────────────────────

describe("PATCH /api/mobile/invoices/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid status", async () => {
    const { PATCH } = await import("@/app/api/mobile/invoices/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/invoices/inv-1", "PATCH", {
        json: async () => ({ status: "draft" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when invoice not found", async () => {
    const { PATCH } = await import("@/app/api/mobile/invoices/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/invoices/inv-1", "PATCH", {
        json: async () => ({ status: "sent" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates status and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "inv-1", status: "draft" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "inv-1", status: "sent" }])
    const { PATCH } = await import("@/app/api/mobile/invoices/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/invoices/inv-1", "PATCH", {
        json: async () => ({ status: "sent" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
  })
})

// ─── DELETE /api/mobile/invoices/[id] ────────────────────────────────────────

describe("DELETE /api/mobile/invoices/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when invoice not found", async () => {
    const { DELETE } = await import("@/app/api/mobile/invoices/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/invoices/inv-1", "DELETE"), mobileCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes and returns 204 for draft invoice", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "inv-1", status: "draft" }])
    const { DELETE } = await import("@/app/api/mobile/invoices/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/invoices/inv-1", "DELETE"), mobileCtx)
    expect(res.status).toBe(204)
  })
})

// ─── POST /api/mobile/orders ──────────────────────────────────────────────────

describe("POST /api/mobile/orders", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/mobile/orders/route")
    const res = await POST(makeReq("/api/mobile/orders"), mobileCtx)
    expect(res.status).toBe(422)
  })

  it("creates order and returns 201 with id", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "order-1", orderNumber: "ORD-0001" }])
    const { POST } = await import("@/app/api/mobile/orders/route")
    const res = await POST(
      makeReq("/api/mobile/orders", "POST", {
        json: async () => ({
          items: [{ name: "Product A", qty: 2, unitPrice: 50 }],
        }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("order-1")
  })
})

// ─── PATCH /api/mobile/orders/[id] ───────────────────────────────────────────

describe("PATCH /api/mobile/orders/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid status", async () => {
    const { PATCH } = await import("@/app/api/mobile/orders/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/orders/order-1", "PATCH", {
        json: async () => ({ status: "unknown" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when order not found", async () => {
    const { PATCH } = await import("@/app/api/mobile/orders/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/orders/order-1", "PATCH", {
        json: async () => ({ status: "confirmed" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates status and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "order-1", status: "pending" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "order-1", status: "confirmed" }])
    const { PATCH } = await import("@/app/api/mobile/orders/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/orders/order-1", "PATCH", {
        json: async () => ({ status: "confirmed" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
  })
})

// ─── DELETE /api/mobile/orders/[id] ──────────────────────────────────────────

describe("DELETE /api/mobile/orders/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when order not found", async () => {
    const { DELETE } = await import("@/app/api/mobile/orders/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/orders/order-1", "DELETE"), mobileCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes and returns 204 for pending order", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "order-1", status: "pending" }])
    const { DELETE } = await import("@/app/api/mobile/orders/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/orders/order-1", "DELETE"), mobileCtx)
    expect(res.status).toBe(204)
  })
})

// ─── POST /api/mobile/projects ────────────────────────────────────────────────

describe("POST /api/mobile/projects", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing name", async () => {
    const { POST } = await import("@/app/api/mobile/projects/route")
    const res = await POST(makeReq("/api/mobile/projects"), mobileCtx)
    expect(res.status).toBe(422)
  })

  it("creates project and returns 201", async () => {
    mockDb.returning.mockResolvedValueOnce([
      { id: "proj-1", name: "Renovation Alpha", status: "draft" },
    ])
    const { POST } = await import("@/app/api/mobile/projects/route")
    const res = await POST(
      makeReq("/api/mobile/projects", "POST", {
        json: async () => ({ name: "Renovation Alpha" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("proj-1")
  })
})

// ─── PATCH /api/mobile/projects/[id] ─────────────────────────────────────────

describe("PATCH /api/mobile/projects/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid status", async () => {
    const { PATCH } = await import("@/app/api/mobile/projects/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/projects/proj-1", "PATCH", {
        json: async () => ({ status: "unknown" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when project not found", async () => {
    const { PATCH } = await import("@/app/api/mobile/projects/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/projects/proj-1", "PATCH", {
        json: async () => ({ status: "active" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates status and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "proj-1", status: "draft" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "proj-1", status: "active" }])
    const { PATCH } = await import("@/app/api/mobile/projects/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/projects/proj-1", "PATCH", {
        json: async () => ({ status: "active" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
  })
})

// ─── DELETE /api/mobile/projects/[id] ────────────────────────────────────────

describe("DELETE /api/mobile/projects/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when project not found", async () => {
    const { DELETE } = await import("@/app/api/mobile/projects/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/projects/proj-1", "DELETE"), mobileCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes and returns 204 for draft project", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "proj-1", status: "draft" }])
    const { DELETE } = await import("@/app/api/mobile/projects/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/projects/proj-1", "DELETE"), mobileCtx)
    expect(res.status).toBe(204)
  })
})
