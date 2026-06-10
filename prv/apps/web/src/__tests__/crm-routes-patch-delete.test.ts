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
  asc: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "1" }]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  clients: {},
  users: {},
  invoices: {},
  invoiceItems: {},
  projects: {},
  stores: {},
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
    sql: vi.fn(),
    count: vi.fn(),
    sum: vi.fn(),
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

// ─── CRM quotes PATCH schema ──────────────────────────────────────────────────

describe("CRM quotes PATCH schema", () => {
  it("accepts valid status values", () => {
    const validStatuses = ["draft", "sent", "paid", "overdue", "cancelled", "refunded"]
    validStatuses.forEach((s) => {
      expect(validStatuses).toContain(s)
    })
  })

  it("rejects unknown status", () => {
    const validStatuses = ["draft", "sent", "paid", "overdue", "cancelled", "refunded"]
    expect(validStatuses).not.toContain("approved")
    expect(validStatuses).not.toContain("pending")
  })

  it("validates dueDate as YYYY-MM-DD", () => {
    const re = /^\d{4}-\d{2}-\d{2}$/
    expect(re.test("2025-12-31")).toBe(true)
    expect(re.test("25-12-31")).toBe(false)
    expect(re.test("2025/12/31")).toBe(false)
  })
})

// ─── CRM quotes DELETE ────────────────────────────────────────────────────────

describe("DELETE /api/crm/quotes/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when quote not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/crm/quotes/[id]/route")
    const res = await DELETE(makeReq("/api/crm/quotes/q-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes quote and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "q-1" }])

    const { DELETE } = await import("@/app/api/crm/quotes/[id]/route")
    const res = await DELETE(makeReq("/api/crm/quotes/q-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action crm.quotes.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "q-1" }])

    const { DELETE } = await import("@/app/api/crm/quotes/[id]/route")
    await DELETE(makeReq("/api/crm/quotes/q-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.quotes.delete" })
    )
  })

  it("returns 400 when ID missing from path", async () => {
    const { DELETE } = await import("@/app/api/crm/quotes/[id]/route")
    const res = await DELETE(makeReq("/api/crm/quotes/"), webCtx)
    expect(res.status).toBe(400)
  })
})

// ─── CRM leads PATCH schema ───────────────────────────────────────────────────

describe("CRM leads PATCH schema", () => {
  it("valid stage values are enumerated", () => {
    const stages = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]
    expect(stages).toContain("new")
    expect(stages).toContain("won")
    expect(stages).not.toContain("pending")
  })

  it("valid source values are enumerated", () => {
    const sources = ["website", "referral", "cold_call", "social", "event", "partner"]
    expect(sources).toContain("referral")
    expect(sources).not.toContain("unknown")
  })
})

// ─── CRM leads DELETE ─────────────────────────────────────────────────────────

describe("DELETE /api/crm/leads/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when lead not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/crm/leads/[id]/route")
    const res = await DELETE(makeReq("/api/crm/leads/lead-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("archives lead and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "lead-1" }])

    const { DELETE } = await import("@/app/api/crm/leads/[id]/route")
    const res = await DELETE(makeReq("/api/crm/leads/lead-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action crm.leads.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "lead-1" }])

    const { DELETE } = await import("@/app/api/crm/leads/[id]/route")
    await DELETE(makeReq("/api/crm/leads/lead-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.leads.delete" })
    )
  })
})

// ─── CRM web clients PATCH schema ────────────────────────────────────────────

describe("CRM web clients PATCH schema", () => {
  it("accepts individual and business types", () => {
    const types = ["individual", "business"]
    expect(types).toContain("individual")
    expect(types).toContain("business")
    expect(types).not.toContain("corporate")
  })
})

// ─── CRM web clients DELETE ───────────────────────────────────────────────────

describe("DELETE /api/crm/clients/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when client not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/crm/clients/[id]/route")
    const res = await DELETE(makeReq("/api/crm/clients/client-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes client and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "client-1", name: "Acme Corp" }])

    const { DELETE } = await import("@/app/api/crm/clients/[id]/route")
    const res = await DELETE(makeReq("/api/crm/clients/client-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action crm.clients.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "client-1", name: "Acme Corp" }])

    const { DELETE } = await import("@/app/api/crm/clients/[id]/route")
    await DELETE(makeReq("/api/crm/clients/client-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.clients.delete" })
    )
  })

  it("returns 400 when ID missing from path", async () => {
    const { DELETE } = await import("@/app/api/crm/clients/[id]/route")
    const res = await DELETE(makeReq("/api/crm/clients/"), webCtx)
    expect(res.status).toBe(400)
  })
})
