import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/mobile/auth", () => ({
  withMobileAuth: (handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  revokeSession: vi.fn().mockResolvedValue(undefined),
  RoleSets: { admin: [], management: [] },
}))

const mockRedis = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue("OK"),
  del: vi.fn().mockResolvedValue(1),
}

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
  then: (resolve: (val: unknown[]) => void) => resolve([{ n: 0 }]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  expenses: {
    id: {},
    title: {},
    category: {},
    amount: {},
    currency: {},
    date: {},
    status: {},
    notes: {},
    storeId: {},
    companyId: {},
    userId: {},
    deletedAt: {},
    createdAt: {},
    updatedAt: {},
  },
  invoices: {
    id: {},
    clientId: {},
    projectId: {},
    issueDate: {},
    dueDate: {},
    currency: {},
    notes: {},
    reference: {},
    status: {},
    total: {},
    invoiceNumber: {},
    companyId: {},
    userId: {},
    paidAt: {},
    deletedAt: {},
    createdAt: {},
    updatedAt: {},
  },
  invoiceItems: { id: {}, invoiceId: {}, name: {}, qty: {}, unitPrice: {}, vatRate: {} },
  orders: {
    id: {},
    clientId: {},
    storeId: {},
    currency: {},
    notes: {},
    status: {},
    total: {},
    orderNumber: {},
    companyId: {},
    userId: {},
    deletedAt: {},
    createdAt: {},
    updatedAt: {},
  },
  orderItems: { id: {}, orderId: {}, name: {}, qty: {}, unitPrice: {}, vatRate: {} },
  projects: {
    id: {},
    name: {},
    clientId: {},
    storeId: {},
    dueDate: {},
    status: {},
    companyId: {},
    ownerId: {},
    completedAt: {},
    deletedAt: {},
    createdAt: {},
    updatedAt: {},
  },
  clients: {
    id: {},
    name: {},
    type: {},
    email: {},
    phone: {},
    city: {},
    vatNumber: {},
    notes: {},
    companyId: {},
    status: {},
    deletedAt: {},
    createdAt: {},
    updatedAt: {},
  },
  users: {
    id: {},
    email: {},
    companyId: {},
    firstName: {},
    lastName: {},
    phone: {},
    jobTitle: {},
    locale: {},
    timezone: {},
    updatedAt: {},
  },
  stores: { id: {}, name: {} },
  notifications: { id: {}, userId: {}, companyId: {} },
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    inArray: vi.fn(),
    notInArray: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    desc: vi.fn(),
    asc: vi.fn(),
    count: vi.fn(),
    sum: vi.fn(),
    sql: vi.fn(),
    ne: vi.fn(),
  }
})

const mobileCtx = {
  userId: "user-1",
  companyId: "company-1",
  sessionId: "session-1",
  role: "store_manager",
}

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
  mockRedis.get.mockResolvedValue(null)
}

// ─── PATCH /api/mobile/profile/patch ──────────────────────────────────────────

describe("PATCH /api/mobile/profile/patch", () => {
  beforeEach(resetMocks)

  it("returns 400 when no fields provided", async () => {
    const { PATCH } = await import("@/app/api/mobile/profile/patch/route")
    const res = await PATCH(makeReq("/api/mobile/profile/patch", "PATCH"), mobileCtx)
    expect(res.status).toBe(400)
  })

  it("returns 422 for invalid field type", async () => {
    const { PATCH } = await import("@/app/api/mobile/profile/patch/route")
    const res = await PATCH(
      makeReq("/api/mobile/profile/patch", "PATCH", {
        json: async () => ({ firstName: 123 }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 200 on valid profile update", async () => {
    const { PATCH } = await import("@/app/api/mobile/profile/patch/route")
    const res = await PATCH(
      makeReq("/api/mobile/profile/patch", "PATCH", {
        json: async () => ({ firstName: "John", lastName: "Doe" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ─── DELETE /api/mobile/security/sessions/[id] ────────────────────────────────

describe("DELETE /api/mobile/security/sessions/[id]", () => {
  beforeEach(resetMocks)

  it("returns 400 when trying to revoke current session", async () => {
    const { DELETE } = await import("@/app/api/mobile/security/sessions/[id]/route")
    const res = await DELETE(
      makeReq("/api/mobile/security/sessions/session-1", "DELETE"),
      mobileCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 404 when session not found in Redis", async () => {
    mockRedis.get.mockResolvedValueOnce(null)
    const { DELETE } = await import("@/app/api/mobile/security/sessions/[id]/route")
    const res = await DELETE(
      makeReq("/api/mobile/security/sessions/other-session", "DELETE"),
      mobileCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 200 on successful session revocation", async () => {
    mockRedis.get.mockResolvedValueOnce({
      userId: "user-1",
      companyId: "company-1",
      sessionId: "other-session",
    })
    const { DELETE } = await import("@/app/api/mobile/security/sessions/[id]/route")
    const res = await DELETE(
      makeReq("/api/mobile/security/sessions/other-session", "DELETE"),
      mobileCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ─── POST /api/mobile/clients ──────────────────────────────────────────────────

describe("POST /api/mobile/clients", () => {
  beforeEach(resetMocks)

  it("returns 422 when name is missing", async () => {
    const { POST } = await import("@/app/api/mobile/clients/route")
    const res = await POST(makeReq("/api/mobile/clients"), mobileCtx)
    expect(res.status).toBe(422)
  })

  it("returns 422 for invalid email", async () => {
    const { POST } = await import("@/app/api/mobile/clients/route")
    const res = await POST(
      makeReq("/api/mobile/clients", "POST", {
        json: async () => ({ name: "Test Client", email: "not-an-email" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 201 with client data on success", async () => {
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "client-1",
        name: "ACME Corp",
        type: "business",
        status: "prospect",
      },
    ])
    const { POST } = await import("@/app/api/mobile/clients/route")
    const res = await POST(
      makeReq("/api/mobile/clients", "POST", {
        json: async () => ({ name: "ACME Corp", type: "business" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("client-1")
    expect(body.name).toBe("ACME Corp")
  })
})

// ─── POST /api/mobile/expenses ─────────────────────────────────────────────────

describe("POST /api/mobile/expenses", () => {
  beforeEach(resetMocks)

  it("returns 422 when required fields missing", async () => {
    const { POST } = await import("@/app/api/mobile/expenses/route")
    const res = await POST(makeReq("/api/mobile/expenses"), mobileCtx)
    expect(res.status).toBe(422)
  })

  it("returns 422 for invalid category", async () => {
    const { POST } = await import("@/app/api/mobile/expenses/route")
    const res = await POST(
      makeReq("/api/mobile/expenses", "POST", {
        json: async () => ({ title: "Lunch", category: "food", amount: 50, date: "2024-01-15" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 201 with expense data on success", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "exp-1", title: "Tools", status: "draft" }])
    const { POST } = await import("@/app/api/mobile/expenses/route")
    const res = await POST(
      makeReq("/api/mobile/expenses", "POST", {
        json: async () => ({ title: "Tools", amount: 250, date: "2024-01-15" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("exp-1")
    expect(body.status).toBe("draft")
  })
})

// ─── PATCH /api/mobile/expenses/[id] ──────────────────────────────────────────

describe("PATCH /api/mobile/expenses/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid status", async () => {
    const { PATCH } = await import("@/app/api/mobile/expenses/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/expenses/exp-1", "PATCH", {
        json: async () => ({ status: "invalid" }),
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

  it("returns 200 with updated status on success", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "exp-1", status: "draft", companyId: "company-1" }])
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

// ─── POST /api/mobile/invoices ─────────────────────────────────────────────────

describe("POST /api/mobile/invoices", () => {
  beforeEach(resetMocks)

  it("returns 422 when required fields missing", async () => {
    const { POST } = await import("@/app/api/mobile/invoices/route")
    const res = await POST(makeReq("/api/mobile/invoices"), mobileCtx)
    expect(res.status).toBe(422)
  })

  it("returns 422 when items array is empty", async () => {
    const { POST } = await import("@/app/api/mobile/invoices/route")
    const res = await POST(
      makeReq("/api/mobile/invoices", "POST", {
        json: async () => ({
          issueDate: "2024-01-15",
          dueDate: "2024-02-15",
          items: [],
        }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 201 with invoice data on success", async () => {
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "inv-1",
        invoiceNumber: "INV-2024-0001",
        status: "draft",
        total: 119,
        currency: "RON",
      },
    ])
    const { POST } = await import("@/app/api/mobile/invoices/route")
    const res = await POST(
      makeReq("/api/mobile/invoices", "POST", {
        json: async () => ({
          issueDate: "2024-01-15",
          dueDate: "2024-02-15",
          items: [{ name: "Service", qty: 1, unitPrice: 100, vatRate: 19 }],
        }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.invoiceNumber).toMatch(/^INV-/)
  })
})

// ─── PATCH /api/mobile/invoices/[id] ──────────────────────────────────────────

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

  it("returns 200 with updated status on success", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "inv-1", status: "draft", companyId: "company-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "inv-1", status: "sent" }])
    const { PATCH } = await import("@/app/api/mobile/invoices/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/invoices/inv-1", "PATCH", {
        json: async () => ({ status: "sent" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("sent")
  })
})

// ─── POST /api/mobile/orders ───────────────────────────────────────────────────

describe("POST /api/mobile/orders", () => {
  beforeEach(resetMocks)

  it("returns 422 when items is missing", async () => {
    const { POST } = await import("@/app/api/mobile/orders/route")
    const res = await POST(makeReq("/api/mobile/orders"), mobileCtx)
    expect(res.status).toBe(422)
  })

  it("returns 422 when items array is empty", async () => {
    const { POST } = await import("@/app/api/mobile/orders/route")
    const res = await POST(
      makeReq("/api/mobile/orders", "POST", {
        json: async () => ({ items: [] }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 201 with order data on success", async () => {
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "ord-1",
        orderNumber: "ORD-2024-0001",
        status: "pending",
        total: 119,
        currency: "RON",
      },
    ])
    const { POST } = await import("@/app/api/mobile/orders/route")
    const res = await POST(
      makeReq("/api/mobile/orders", "POST", {
        json: async () => ({ items: [{ name: "Item A", qty: 1, unitPrice: 100 }] }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.orderNumber).toMatch(/^ORD-/)
  })
})

// ─── PATCH /api/mobile/orders/[id] ────────────────────────────────────────────

describe("PATCH /api/mobile/orders/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid status", async () => {
    const { PATCH } = await import("@/app/api/mobile/orders/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/orders/ord-1", "PATCH", {
        json: async () => ({ status: "archived" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when order not found", async () => {
    const { PATCH } = await import("@/app/api/mobile/orders/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/orders/ord-1", "PATCH", {
        json: async () => ({ status: "confirmed" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 200 with updated status on success", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "ord-1", status: "pending", companyId: "company-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "ord-1", status: "confirmed" }])
    const { PATCH } = await import("@/app/api/mobile/orders/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/orders/ord-1", "PATCH", {
        json: async () => ({ status: "confirmed" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("confirmed")
  })

  it("returns 409 on an illegal lifecycle transition", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "ord-1", status: "delivered", companyId: "company-1" },
    ])
    const { PATCH } = await import("@/app/api/mobile/orders/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/orders/ord-1", "PATCH", {
        json: async () => ({ status: "pending" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(409)
  })
})

// ─── POST /api/mobile/projects ─────────────────────────────────────────────────

describe("POST /api/mobile/projects", () => {
  beforeEach(resetMocks)

  it("returns 422 when name is missing", async () => {
    const { POST } = await import("@/app/api/mobile/projects/route")
    const res = await POST(makeReq("/api/mobile/projects"), mobileCtx)
    expect(res.status).toBe(422)
  })

  it("returns 201 with project data on success", async () => {
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "proj-1",
        projectCode: "PROJ-2024-0001",
        status: "draft",
        name: "Renovation Project",
      },
    ])
    const { POST } = await import("@/app/api/mobile/projects/route")
    const res = await POST(
      makeReq("/api/mobile/projects", "POST", {
        json: async () => ({ name: "Renovation Project" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("proj-1")
  })
})

// ─── PATCH /api/mobile/projects/[id] ──────────────────────────────────────────

describe("PATCH /api/mobile/projects/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid status", async () => {
    const { PATCH } = await import("@/app/api/mobile/projects/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/projects/proj-1", "PATCH", {
        json: async () => ({ status: "archived" }),
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

  it("returns 200 with updated status on success", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "proj-1", status: "draft", companyId: "company-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "proj-1", status: "active" }])
    const { PATCH } = await import("@/app/api/mobile/projects/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/projects/proj-1", "PATCH", {
        json: async () => ({ status: "active" }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("active")
  })
})
