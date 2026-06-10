import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
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
  expenses: {
    id: {},
    companyId: {},
    deletedAt: {},
    submittedById: {},
    category: {},
    status: {},
    amount: {},
    currency: {},
    date: {},
    notes: {},
    $inferInsert: {},
  },
  invoices: {
    id: {},
    companyId: {},
    deletedAt: {},
    status: {},
    dueDate: {},
    issueDate: {},
    paidAt: {},
    invoiceNumber: {},
    total: {},
    clientId: {},
    projectId: {},
    notes: {},
  },
  clients: {
    id: {},
    companyId: {},
    status: {},
    deletedAt: {},
    isActive: {},
    metadata: {},
    name: {},
    email: {},
    phone: {},
    type: {},
    city: {},
  },
  invoiceItems: {},
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
  mockDb.onConflictDoUpdate.mockReturnThis()
  mockDb.returning.mockResolvedValue([{ id: "new-1" }])
}

// ─── POST /api/finance/expenses ───────────────────────────────────────────────

describe("POST /api/finance/expenses", () => {
  beforeEach(resetMocks)

  it("creates expense and returns 201 with id", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "exp-new" }])
    const { POST } = await import("@/app/api/finance/expenses/route")
    const res = await POST(
      makeReq("/api/finance/expenses", "POST", {
        json: async () => ({
          title: "Office Supplies",
          lines: [{ amount: 100, vatRate: 19, category: "materiale" }],
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.expense.id).toBe("exp-new")
  })

  it("fires audit log with action finance.expenses.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "exp-new" }])
    const { POST } = await import("@/app/api/finance/expenses/route")
    await POST(
      makeReq("/api/finance/expenses", "POST", {
        json: async () => ({ title: "Supplies" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "finance.expenses.create" })
    )
  })
})

// ─── PATCH /api/finance/expenses/[id] ────────────────────────────────────────

describe("PATCH /api/finance/expenses/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when expense not found", async () => {
    const { PATCH } = await import("@/app/api/finance/expenses/[id]/route")
    const res = await PATCH(
      makeReq("/api/finance/expenses/exp-1", "PATCH", {
        json: async () => ({ status: "submitted" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 422 for invalid body", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "exp-1" }])
    const { PATCH } = await import("@/app/api/finance/expenses/[id]/route")
    const res = await PATCH(
      makeReq("/api/finance/expenses/exp-1", "PATCH", {
        json: async () => ({ receiptUrl: "not-a-url" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("updates expense and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "exp-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "exp-1" }])
    const { PATCH } = await import("@/app/api/finance/expenses/[id]/route")
    const res = await PATCH(
      makeReq("/api/finance/expenses/exp-1", "PATCH", {
        json: async () => ({ status: "submitted" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "finance.expenses.update" })
    )
  })
})

// ─── DELETE /api/finance/expenses/[id] ───────────────────────────────────────

describe("DELETE /api/finance/expenses/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when expense not found", async () => {
    const { DELETE } = await import("@/app/api/finance/expenses/[id]/route")
    const res = await DELETE(makeReq("/api/finance/expenses/exp-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes expense and returns 204 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "exp-1" }])
    const { DELETE } = await import("@/app/api/finance/expenses/[id]/route")
    const res = await DELETE(makeReq("/api/finance/expenses/exp-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "finance.expenses.delete" })
    )
  })
})

// ─── PATCH /api/finance/invoices/[id] ────────────────────────────────────────

describe("PATCH /api/finance/invoices/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when invoice not found", async () => {
    const { PATCH } = await import("@/app/api/finance/invoices/[id]/route")
    const res = await PATCH(
      makeReq("/api/finance/invoices/inv-1", "PATCH", {
        json: async () => ({ status: "paid" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 422 for invalid body", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "inv-1" }])
    const { PATCH } = await import("@/app/api/finance/invoices/[id]/route")
    const res = await PATCH(
      makeReq("/api/finance/invoices/inv-1", "PATCH", {
        json: async () => ({ dueDate: "not-a-date" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("updates invoice and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "inv-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "inv-1" }])
    const { PATCH } = await import("@/app/api/finance/invoices/[id]/route")
    const res = await PATCH(
      makeReq("/api/finance/invoices/inv-1", "PATCH", {
        json: async () => ({ status: "paid" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "finance.invoices.update" })
    )
  })
})

// ─── DELETE /api/finance/invoices/[id] ───────────────────────────────────────

describe("DELETE /api/finance/invoices/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when invoice not found", async () => {
    const { DELETE } = await import("@/app/api/finance/invoices/[id]/route")
    const res = await DELETE(makeReq("/api/finance/invoices/inv-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes invoice and returns 204 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "inv-1" }])
    const { DELETE } = await import("@/app/api/finance/invoices/[id]/route")
    const res = await DELETE(makeReq("/api/finance/invoices/inv-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "finance.invoices.delete" })
    )
  })
})

// ─── POST /api/finance/invoices/[id]/payment ──────────────────────────────────

describe("POST /api/finance/invoices/[id]/payment", () => {
  beforeEach(resetMocks)

  it("returns 400 for missing required fields", async () => {
    const { POST } = await import("@/app/api/finance/invoices/[id]/payment/route")
    const res = await POST(makeReq("/api/finance/invoices/inv-1/payment"), webCtx)
    expect(res.status).toBe(400)
  })

  it("records payment and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/finance/invoices/[id]/payment/route")
    const res = await POST(
      makeReq("/api/finance/invoices/inv-1/payment", "POST", {
        json: async () => ({ method: "bank_transfer", paidDate: "2026-06-10", amount: 1190 }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "finance.invoice.payment" })
    )
  })
})

// ─── PATCH /api/crm/leads/[id] ────────────────────────────────────────────────

describe("PATCH /api/crm/leads/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid email", async () => {
    const { PATCH } = await import("@/app/api/crm/leads/[id]/route")
    const res = await PATCH(
      makeReq("/api/crm/leads/lead-1", "PATCH", {
        json: async () => ({ email: "not-an-email" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when lead not found", async () => {
    const { PATCH } = await import("@/app/api/crm/leads/[id]/route")
    const res = await PATCH(
      makeReq("/api/crm/leads/lead-1", "PATCH", {
        json: async () => ({ stage: "contacted" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates lead and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ metadata: {}, name: "John Doe" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "lead-1", name: "John Doe" }])
    const { PATCH } = await import("@/app/api/crm/leads/[id]/route")
    const res = await PATCH(
      makeReq("/api/crm/leads/lead-1", "PATCH", {
        json: async () => ({ stage: "qualified", score: 80 }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.leads.update" })
    )
  })
})

// ─── DELETE /api/crm/leads/[id] ──────────────────────────────────────────────

describe("DELETE /api/crm/leads/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when lead not found", async () => {
    const { DELETE } = await import("@/app/api/crm/leads/[id]/route")
    const res = await DELETE(makeReq("/api/crm/leads/lead-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes lead and returns 204 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "lead-1", name: "John Doe" }])
    const { DELETE } = await import("@/app/api/crm/leads/[id]/route")
    const res = await DELETE(makeReq("/api/crm/leads/lead-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.leads.delete" })
    )
  })
})

// ─── PATCH /api/crm/quotes/[id] ──────────────────────────────────────────────

describe("PATCH /api/crm/quotes/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when quote not found", async () => {
    const { PATCH } = await import("@/app/api/crm/quotes/[id]/route")
    const res = await PATCH(
      makeReq("/api/crm/quotes/quote-1", "PATCH", {
        json: async () => ({ status: "sent" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 422 for invalid body", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "quote-1" }])
    const { PATCH } = await import("@/app/api/crm/quotes/[id]/route")
    const res = await PATCH(
      makeReq("/api/crm/quotes/quote-1", "PATCH", {
        json: async () => ({ dueDate: "not-a-date" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("updates quote and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "quote-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "quote-1" }])
    const { PATCH } = await import("@/app/api/crm/quotes/[id]/route")
    const res = await PATCH(
      makeReq("/api/crm/quotes/quote-1", "PATCH", {
        json: async () => ({ status: "sent" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.quotes.update" })
    )
  })
})

// ─── DELETE /api/crm/quotes/[id] ─────────────────────────────────────────────

describe("DELETE /api/crm/quotes/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when quote not found", async () => {
    const { DELETE } = await import("@/app/api/crm/quotes/[id]/route")
    const res = await DELETE(makeReq("/api/crm/quotes/quote-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes quote and returns 204 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "quote-1" }])
    const { DELETE } = await import("@/app/api/crm/quotes/[id]/route")
    const res = await DELETE(makeReq("/api/crm/quotes/quote-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.quotes.delete" })
    )
  })
})
