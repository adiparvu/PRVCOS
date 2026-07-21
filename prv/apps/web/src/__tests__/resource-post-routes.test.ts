import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
}))

vi.mock("@prv/search", () => ({
  upsertDocument: vi.fn().mockResolvedValue(undefined),
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "new-1", name: "Test" }]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  projects: {},
  documents: {},
  suppliers: {},
  vehicles: {},
  shifts: {},
  clients: {},
  projectMembers: {},
  projectMilestones: {},
  invoices: {},
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
    notInArray: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    not: vi.fn(),
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
    headers: { get: () => null },
    json: async () => ({}),
    ...overrides,
  } as unknown as Request
}

function resetMocks() {
  vi.resetAllMocks()
  mockDb.select.mockReturnThis()
  mockDb.insert.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockReturnThis()
  mockDb.values.mockReturnThis()
  mockDb.innerJoin.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.returning.mockResolvedValue([{ id: "new-1", name: "Test" }])
}

// ─── POST /api/projects ───────────────────────────────────────────────────────

describe("POST /api/projects", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required name", async () => {
    const { POST } = await import("@/app/api/projects/route")
    const res = await POST(makeReq("/api/projects"), webCtx)
    expect(res.status).toBe(422)
  })

  it("returns 422 when dueDate precedes startDate", async () => {
    const { POST } = await import("@/app/api/projects/route")
    const res = await POST(
      makeReq("/api/projects", "POST", {
        json: async () => ({ name: "P", startDate: "2026-06-10", dueDate: "2026-06-01" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
    expect((await res.json()).error).toMatch(/on or before/)
  })

  it("creates project and returns 201 with id and name", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "proj-new", name: "New Project" }])
    const { POST } = await import("@/app/api/projects/route")
    const res = await POST(
      makeReq("/api/projects", "POST", {
        json: async () => ({ name: "New Project", status: "draft" }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("proj-new")
    expect(body.name).toBe("New Project")
  })

  it("fires audit log with action projects.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "proj-new", name: "New Project" }])
    const { POST } = await import("@/app/api/projects/route")
    await POST(
      makeReq("/api/projects", "POST", {
        json: async () => ({ name: "New Project" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "projects.create" })
    )
  })
})

// ─── POST /api/documents ──────────────────────────────────────────────────────

describe("POST /api/documents", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/documents/route")
    const res = await POST(makeReq("/api/documents"), webCtx)
    expect(res.status).toBe(422)
  })

  it("creates document and returns 201 with id and title", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "doc-new", title: "Contract.pdf" }])
    const { POST } = await import("@/app/api/documents/route")
    const res = await POST(
      makeReq("/api/documents", "POST", {
        json: async () => ({
          title: "Contract.pdf",
          fileUrl: "https://storage.example.com/contract.pdf",
          fileName: "contract.pdf",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("doc-new")
    expect(body.title).toBe("Contract.pdf")
  })

  it("fires audit log with action documents.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "doc-new", title: "Report.pdf" }])
    const { POST } = await import("@/app/api/documents/route")
    await POST(
      makeReq("/api/documents", "POST", {
        json: async () => ({
          title: "Report.pdf",
          fileUrl: "https://storage.example.com/report.pdf",
          fileName: "report.pdf",
        }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "documents.create" })
    )
  })
})

// ─── POST /api/suppliers ──────────────────────────────────────────────────────

describe("POST /api/suppliers", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required name", async () => {
    const { POST } = await import("@/app/api/suppliers/route")
    const res = await POST(makeReq("/api/suppliers"), webCtx)
    expect(res.status).toBe(422)
  })

  it("creates supplier and returns 201 with id and name", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "sup-new", name: "ACME Supplies" }])
    const { POST } = await import("@/app/api/suppliers/route")
    const res = await POST(
      makeReq("/api/suppliers", "POST", {
        json: async () => ({ name: "ACME Supplies" }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("sup-new")
    expect(body.name).toBe("ACME Supplies")
  })

  it("fires audit log with action suppliers.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "sup-new", name: "ACME Supplies" }])
    const { POST } = await import("@/app/api/suppliers/route")
    await POST(
      makeReq("/api/suppliers", "POST", {
        json: async () => ({ name: "ACME Supplies" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "suppliers.create" })
    )
  })
})

// ─── POST /api/fleet ──────────────────────────────────────────────────────────

describe("POST /api/fleet", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/fleet/route")
    const res = await POST(makeReq("/api/fleet"), webCtx)
    expect(res.status).toBe(422)
  })

  it("creates vehicle and returns 201 with id and licensePlate", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "veh-new", licensePlate: "B-123-ABC" }])
    const { POST } = await import("@/app/api/fleet/route")
    const res = await POST(
      makeReq("/api/fleet", "POST", {
        json: async () => ({ make: "Dacia", model: "Logan", licensePlate: "B-123-ABC" }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("veh-new")
    expect(body.licensePlate).toBe("B-123-ABC")
  })

  it("fires audit log with action fleet.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "veh-new", licensePlate: "B-456-DEF" }])
    const { POST } = await import("@/app/api/fleet/route")
    await POST(
      makeReq("/api/fleet", "POST", {
        json: async () => ({ make: "Ford", model: "Transit", licensePlate: "B-456-DEF" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "fleet.create" }))
  })
})

// ─── POST /api/schedule ───────────────────────────────────────────────────────

describe("POST /api/schedule", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/schedule/route")
    const res = await POST(makeReq("/api/schedule"), webCtx)
    expect(res.status).toBe(422)
  })

  it("creates shift and returns 201 with id and title", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "shift-new", title: "Morning Shift" }])
    const { POST } = await import("@/app/api/schedule/route")
    const res = await POST(
      makeReq("/api/schedule", "POST", {
        json: async () => ({
          title: "Morning Shift",
          date: "2025-02-01",
          startTime: "08:00",
          endTime: "16:00",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("shift-new")
    expect(body.title).toBe("Morning Shift")
  })

  it("fires audit log with action schedule.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "shift-new", title: "Evening Shift" }])
    const { POST } = await import("@/app/api/schedule/route")
    await POST(
      makeReq("/api/schedule", "POST", {
        json: async () => ({
          title: "Evening Shift",
          date: "2025-02-01",
          startTime: "16:00",
          endTime: "00:00",
        }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "schedule.create" })
    )
  })
})
