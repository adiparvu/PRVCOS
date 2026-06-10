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
  documents: { id: {}, companyId: {}, deletedAt: {}, title: {}, status: {} },
  documentSignatures: {},
  projects: { id: {}, companyId: {}, name: {}, status: {}, deletedAt: {} },
  projectMembers: {},
  projectMilestones: {},
  vehicles: { id: {}, companyId: {}, licensePlate: {}, status: {}, deletedAt: {} },
  vehicleDailyLogs: { date: {}, odometerKm: {} },
  suppliers: { id: {}, companyId: {}, name: {}, status: {}, deletedAt: {} },
  shifts: { id: {}, companyId: {} },
  shiftAssignments: {},
  users: { id: {}, firstName: {}, lastName: {}, companyId: {} },
  stores: { id: {}, name: {} },
  clients: { id: {}, name: {}, companyId: {} },
  invoices: { id: {}, total: {}, companyId: {} },
  auditLogs: { id: {}, action: {}, createdAt: {}, companyId: {} },
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
  mockDb.onConflictDoUpdate.mockReturnThis()
  mockDb.returning.mockResolvedValue([{ id: "new-1" }])
}

// ─── PATCH /api/documents/[id] ────────────────────────────────────────────────

describe("PATCH /api/documents/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for empty body", async () => {
    const { PATCH } = await import("@/app/api/documents/[id]/route")
    const res = await PATCH(
      makeReq("/api/documents/doc-1", "PATCH", { json: async () => ({}) }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when document not found", async () => {
    const { PATCH } = await import("@/app/api/documents/[id]/route")
    const res = await PATCH(
      makeReq("/api/documents/doc-1", "PATCH", {
        json: async () => ({ status: "published" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates document and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "doc-1", title: "Contract" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "doc-1", status: "published" }])
    const { PATCH } = await import("@/app/api/documents/[id]/route")
    const res = await PATCH(
      makeReq("/api/documents/doc-1", "PATCH", {
        json: async () => ({ status: "published" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "documents.update" })
    )
  })
})

// ─── DELETE /api/documents/[id] ──────────────────────────────────────────────

describe("DELETE /api/documents/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when document not found", async () => {
    const { DELETE } = await import("@/app/api/documents/[id]/route")
    const res = await DELETE(makeReq("/api/documents/doc-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes document and returns 204 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "doc-1", title: "Contract" }])
    const { DELETE } = await import("@/app/api/documents/[id]/route")
    const res = await DELETE(makeReq("/api/documents/doc-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "documents.delete" })
    )
  })
})

// ─── PATCH /api/projects/[id] ─────────────────────────────────────────────────

describe("PATCH /api/projects/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when project not found", async () => {
    const { PATCH } = await import("@/app/api/projects/[id]/route")
    const res = await PATCH(
      makeReq("/api/projects/proj-1", "PATCH", {
        json: async () => ({ status: "active" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 422 for invalid budget value", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "proj-1", name: "Renovation" }])
    const { PATCH } = await import("@/app/api/projects/[id]/route")
    const res = await PATCH(
      makeReq("/api/projects/proj-1", "PATCH", {
        json: async () => ({ budget: -500 }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("updates project and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "proj-1", name: "Renovation" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "proj-1", name: "Renovation", status: "active" }])
    const { PATCH } = await import("@/app/api/projects/[id]/route")
    const res = await PATCH(
      makeReq("/api/projects/proj-1", "PATCH", {
        json: async () => ({ status: "active" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "projects.update" })
    )
  })
})

// ─── DELETE /api/projects/[id] ───────────────────────────────────────────────

describe("DELETE /api/projects/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when project not found", async () => {
    const { DELETE } = await import("@/app/api/projects/[id]/route")
    const res = await DELETE(makeReq("/api/projects/proj-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes project and returns 204 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "proj-1", name: "Renovation" }])
    const { DELETE } = await import("@/app/api/projects/[id]/route")
    const res = await DELETE(makeReq("/api/projects/proj-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "projects.delete" })
    )
  })
})

// ─── PATCH /api/fleet/[id] ────────────────────────────────────────────────────

describe("PATCH /api/fleet/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for empty body", async () => {
    const { PATCH } = await import("@/app/api/fleet/[id]/route")
    const res = await PATCH(
      makeReq("/api/fleet/veh-1", "PATCH", { json: async () => ({}) }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when vehicle not found", async () => {
    const { PATCH } = await import("@/app/api/fleet/[id]/route")
    const res = await PATCH(
      makeReq("/api/fleet/veh-1", "PATCH", {
        json: async () => ({ status: "maintenance" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates vehicle and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "veh-1", licensePlate: "B-123-PRV" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "veh-1", status: "maintenance" }])
    const { PATCH } = await import("@/app/api/fleet/[id]/route")
    const res = await PATCH(
      makeReq("/api/fleet/veh-1", "PATCH", {
        json: async () => ({ status: "maintenance" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "fleet.update" }))
  })
})

// ─── DELETE /api/fleet/[id] ───────────────────────────────────────────────────

describe("DELETE /api/fleet/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when vehicle not found", async () => {
    const { DELETE } = await import("@/app/api/fleet/[id]/route")
    const res = await DELETE(makeReq("/api/fleet/veh-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes vehicle and returns 204 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "veh-1", licensePlate: "B-123-PRV" }])
    const { DELETE } = await import("@/app/api/fleet/[id]/route")
    const res = await DELETE(makeReq("/api/fleet/veh-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "fleet.delete" }))
  })
})

// ─── PATCH /api/suppliers/[id] ────────────────────────────────────────────────

describe("PATCH /api/suppliers/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for empty body", async () => {
    const { PATCH } = await import("@/app/api/suppliers/[id]/route")
    const res = await PATCH(
      makeReq("/api/suppliers/sup-1", "PATCH", { json: async () => ({}) }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when supplier not found", async () => {
    const { PATCH } = await import("@/app/api/suppliers/[id]/route")
    const res = await PATCH(
      makeReq("/api/suppliers/sup-1", "PATCH", {
        json: async () => ({ status: "inactive" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates supplier and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "sup-1", name: "ACME Corp" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "sup-1", status: "inactive" }])
    const { PATCH } = await import("@/app/api/suppliers/[id]/route")
    const res = await PATCH(
      makeReq("/api/suppliers/sup-1", "PATCH", {
        json: async () => ({ status: "inactive" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "suppliers.update" })
    )
  })
})

// ─── DELETE /api/suppliers/[id] ──────────────────────────────────────────────

describe("DELETE /api/suppliers/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when supplier not found", async () => {
    const { DELETE } = await import("@/app/api/suppliers/[id]/route")
    const res = await DELETE(makeReq("/api/suppliers/sup-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes supplier and returns 204 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "sup-1", name: "ACME Corp" }])
    const { DELETE } = await import("@/app/api/suppliers/[id]/route")
    const res = await DELETE(makeReq("/api/suppliers/sup-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "suppliers.delete" })
    )
  })
})

// ─── PATCH /api/schedule/[id] ─────────────────────────────────────────────────

describe("PATCH /api/schedule/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when shift not found", async () => {
    const { PATCH } = await import("@/app/api/schedule/[id]/route")
    const res = await PATCH(
      makeReq("/api/schedule/shift-1", "PATCH", {
        json: async () => ({ title: "Morning Shift" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 422 for invalid date format", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "shift-1" }])
    const { PATCH } = await import("@/app/api/schedule/[id]/route")
    const res = await PATCH(
      makeReq("/api/schedule/shift-1", "PATCH", {
        json: async () => ({ date: "not-a-date" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("updates shift and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "shift-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "shift-1" }])
    const { PATCH } = await import("@/app/api/schedule/[id]/route")
    const res = await PATCH(
      makeReq("/api/schedule/shift-1", "PATCH", {
        json: async () => ({ title: "Updated Morning Shift" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "schedule.update" })
    )
  })
})

// ─── DELETE /api/schedule/[id] ───────────────────────────────────────────────

describe("DELETE /api/schedule/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when shift not found", async () => {
    const { DELETE } = await import("@/app/api/schedule/[id]/route")
    const res = await DELETE(makeReq("/api/schedule/shift-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes shift and returns 204 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "shift-1" }])
    const { DELETE } = await import("@/app/api/schedule/[id]/route")
    const res = await DELETE(makeReq("/api/schedule/shift-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "schedule.delete" })
    )
  })
})
