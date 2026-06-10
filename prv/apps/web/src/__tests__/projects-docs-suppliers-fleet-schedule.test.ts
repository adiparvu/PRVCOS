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
  projects: {},
  projectMembers: {},
  projectMilestones: {},
  clients: {},
  users: {},
  invoices: {},
  auditLogs: {},
  documents: {},
  documentSignatures: {},
  suppliers: {},
  vehicles: {},
  stores: {},
  vehicleDailyLogs: {},
  shifts: {},
  shiftAssignments: {},
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
    gte: vi.fn(),
    lte: vi.fn(),
    notInArray: vi.fn(),
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

// ─── Projects DELETE ──────────────────────────────────────────────────────────

describe("DELETE /api/projects/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when project not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/projects/[id]/route")
    const res = await DELETE(makeReq("/api/projects/proj-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes project and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "proj-1" }])

    const { DELETE } = await import("@/app/api/projects/[id]/route")
    const res = await DELETE(makeReq("/api/projects/proj-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action projects.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "proj-1" }])

    const { DELETE } = await import("@/app/api/projects/[id]/route")
    await DELETE(makeReq("/api/projects/proj-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "projects.delete" })
    )
  })

  it("returns 400 when ID missing", async () => {
    const { DELETE } = await import("@/app/api/projects/[id]/route")
    const res = await DELETE(makeReq("/api/projects/"), webCtx)
    expect(res.status).toBe(400)
  })
})

// ─── Documents DELETE ─────────────────────────────────────────────────────────

describe("DELETE /api/documents/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when document not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/documents/[id]/route")
    const res = await DELETE(makeReq("/api/documents/doc-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes document and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "doc-1" }])

    const { DELETE } = await import("@/app/api/documents/[id]/route")
    const res = await DELETE(makeReq("/api/documents/doc-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action documents.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "doc-1" }])

    const { DELETE } = await import("@/app/api/documents/[id]/route")
    await DELETE(makeReq("/api/documents/doc-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "documents.delete" })
    )
  })
})

// ─── Suppliers DELETE ─────────────────────────────────────────────────────────

describe("DELETE /api/suppliers/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when supplier not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/suppliers/[id]/route")
    const res = await DELETE(makeReq("/api/suppliers/sup-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes supplier and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "sup-1" }])

    const { DELETE } = await import("@/app/api/suppliers/[id]/route")
    const res = await DELETE(makeReq("/api/suppliers/sup-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action suppliers.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "sup-1" }])

    const { DELETE } = await import("@/app/api/suppliers/[id]/route")
    await DELETE(makeReq("/api/suppliers/sup-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "suppliers.delete" })
    )
  })
})

// ─── Fleet (vehicles) DELETE ──────────────────────────────────────────────────

describe("DELETE /api/fleet/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when vehicle not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/fleet/[id]/route")
    const res = await DELETE(makeReq("/api/fleet/veh-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes vehicle and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "veh-1" }])

    const { DELETE } = await import("@/app/api/fleet/[id]/route")
    const res = await DELETE(makeReq("/api/fleet/veh-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action fleet.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "veh-1" }])

    const { DELETE } = await import("@/app/api/fleet/[id]/route")
    await DELETE(makeReq("/api/fleet/veh-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "fleet.delete" }))
  })
})

// ─── Schedule (shifts) DELETE ─────────────────────────────────────────────────

describe("DELETE /api/schedule/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when shift not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/schedule/[id]/route")
    const res = await DELETE(makeReq("/api/schedule/shift-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes shift and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "shift-1" }])

    const { DELETE } = await import("@/app/api/schedule/[id]/route")
    const res = await DELETE(makeReq("/api/schedule/shift-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action schedule.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "shift-1" }])

    const { DELETE } = await import("@/app/api/schedule/[id]/route")
    await DELETE(makeReq("/api/schedule/shift-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "schedule.delete" })
    )
  })
})
