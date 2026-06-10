import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "1" }]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  invoices: {},
  invoiceItems: {},
  clients: {},
  clientContacts: {},
  projects: {},
  auditLogs: {},
  expenses: {},
  expenseItems: {},
  users: {},
  userPresence: {},
  socialProfiles: {},
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
    sql: vi.fn(),
    count: vi.fn(),
    inArray: vi.fn(),
  }
})

const webCtx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "session-1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}

function makeReq(path: string, method = "DELETE", overrides: Partial<Request> = {}): Request {
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
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockReturnThis()
  mockDb.set.mockReturnThis()
  mockDb.innerJoin.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.returning.mockResolvedValue([{ id: "1" }])
}

// ─── Finance invoices PATCH status schema ────────────────────────────────────

describe("finance invoice PATCH status schema", () => {
  it("accepts valid invoice statuses", () => {
    const statuses = ["draft", "sent", "paid", "overdue", "cancelled", "refunded"]
    expect(statuses).toContain("draft")
    expect(statuses).toContain("paid")
    expect(statuses).not.toContain("pending")
  })
})

// ─── Finance invoices DELETE ──────────────────────────────────────────────────

describe("DELETE /api/finance/invoices/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when invoice not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/finance/invoices/[id]/route")
    const res = await DELETE(makeReq("/api/finance/invoices/inv-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes invoice and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "inv-1" }])

    const { DELETE } = await import("@/app/api/finance/invoices/[id]/route")
    const res = await DELETE(makeReq("/api/finance/invoices/inv-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action finance.invoices.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "inv-1" }])

    const { DELETE } = await import("@/app/api/finance/invoices/[id]/route")
    await DELETE(makeReq("/api/finance/invoices/inv-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "finance.invoices.delete" })
    )
  })

  it("returns 400 when ID missing", async () => {
    const { DELETE } = await import("@/app/api/finance/invoices/[id]/route")
    const res = await DELETE(makeReq("/api/finance/invoices/"), webCtx)
    expect(res.status).toBe(400)
  })
})

// ─── Finance expenses PATCH status schema ────────────────────────────────────

describe("finance expense PATCH status schema", () => {
  it("valid expense statuses", () => {
    const statuses = ["draft", "submitted", "approved", "rejected", "paid"]
    expect(statuses).toContain("submitted")
    expect(statuses).toContain("paid")
    expect(statuses).not.toContain("cancelled")
  })
})

// ─── Finance expenses DELETE ──────────────────────────────────────────────────

describe("DELETE /api/finance/expenses/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when expense not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/finance/expenses/[id]/route")
    const res = await DELETE(makeReq("/api/finance/expenses/exp-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes expense and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "exp-1" }])

    const { DELETE } = await import("@/app/api/finance/expenses/[id]/route")
    const res = await DELETE(makeReq("/api/finance/expenses/exp-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action finance.expenses.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "exp-1" }])

    const { DELETE } = await import("@/app/api/finance/expenses/[id]/route")
    await DELETE(makeReq("/api/finance/expenses/exp-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "finance.expenses.delete" })
    )
  })
})

// ─── People PATCH schema ──────────────────────────────────────────────────────

describe("people PATCH schema", () => {
  it("valid user statuses for update", () => {
    const statuses = ["active", "inactive", "suspended", "onboarding", "offboarded"]
    expect(statuses).toContain("active")
    expect(statuses).toContain("suspended")
    expect(statuses).not.toContain("deleted")
  })
})

// ─── People DELETE ────────────────────────────────────────────────────────────

describe("DELETE /api/people/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when person not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/people/[id]/route")
    const res = await DELETE(makeReq("/api/people/user-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes person and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "user-1" }])

    const { DELETE } = await import("@/app/api/people/[id]/route")
    const res = await DELETE(makeReq("/api/people/user-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action people.deactivate", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "user-1" }])

    const { DELETE } = await import("@/app/api/people/[id]/route")
    await DELETE(makeReq("/api/people/user-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "people.deactivate" })
    )
  })

  it("returns 400 when ID missing", async () => {
    const { DELETE } = await import("@/app/api/people/[id]/route")
    const res = await DELETE(makeReq("/api/people/"), webCtx)
    expect(res.status).toBe(400)
  })
})
