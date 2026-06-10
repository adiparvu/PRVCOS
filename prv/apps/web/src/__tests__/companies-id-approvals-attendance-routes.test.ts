import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

const mockHasScope = vi.fn().mockReturnValue(true)

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  RoleSets: { admin: [], management: [] },
  hasScope: mockHasScope,
}))

vi.mock("@prv/approval-engine", () => ({
  submitForApproval: vi.fn().mockResolvedValue("apr-new"),
  processApproval: vi.fn().mockResolvedValue(undefined),
  escalateApproval: vi.fn().mockResolvedValue(undefined),
  delegateApproval: vi.fn().mockResolvedValue(undefined),
  ApprovalNotFoundError: class ApprovalNotFoundError extends Error {
    constructor(msg?: string) {
      super(msg ?? "Approval not found")
      this.name = "ApprovalNotFoundError"
    }
  },
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
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
  companies: { id: {}, isActive: {}, deletedAt: {}, slug: {} },
  companyMemberships: { id: {}, companyId: {}, userId: {}, primaryRole: {}, status: {} },
  approvalRequests: {
    id: {},
    companyId: {},
    type: {},
    ref: {},
    title: {},
    description: {},
    value: {},
    deadline: {},
    status: {},
    createdAt: {},
    resolvedAt: {},
    requestedByUserId: {},
    approvedByUserId: {},
  },
  users: { id: {}, firstName: {}, lastName: {}, jobTitle: {} },
  attendanceRecords: {
    id: {},
    companyId: {},
    userId: {},
    status: {},
    date: {},
    scheduledStart: {},
    scheduledEnd: {},
    clockIn: {},
    clockOut: {},
    lateMinutes: {},
    gpsVerified: {},
  },
  leaveRequests: { id: {}, label: {} },
  stores: { id: {}, name: {} },
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
  mockHasScope.mockReturnValue(true)
  mockDb.select.mockReturnThis()
  mockDb.insert.mockReturnThis()
  mockDb.update.mockReturnThis()
  mockDb.delete.mockReturnThis()
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

// ─── PATCH /api/companies/[id] ────────────────────────────────────────────────

describe("PATCH /api/companies/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when company not found", async () => {
    const { PATCH } = await import("@/app/api/companies/[id]/route")
    const res = await PATCH(
      makeReq("/api/companies/company-1", "PATCH", {
        json: async () => ({ name: "New Name" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 422 for invalid body", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "company-1", slug: "prv" }])
    const { PATCH } = await import("@/app/api/companies/[id]/route")
    const res = await PATCH(
      makeReq("/api/companies/company-1", "PATCH", {
        json: async () => ({ email: "not-an-email" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("updates company and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "company-1", slug: "prv" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "company-1", name: "PRV Updated", slug: "prv" }])
    const { PATCH } = await import("@/app/api/companies/[id]/route")
    const res = await PATCH(
      makeReq("/api/companies/company-1", "PATCH", {
        json: async () => ({ name: "PRV Updated" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "companies.update" })
    )
  })
})

// ─── DELETE /api/companies/[id] ───────────────────────────────────────────────

describe("DELETE /api/companies/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when company not found", async () => {
    const { DELETE } = await import("@/app/api/companies/[id]/route")
    const res = await DELETE(makeReq("/api/companies/company-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes company and returns 204 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "company-1", name: "PRV" }])
    const { DELETE } = await import("@/app/api/companies/[id]/route")
    const res = await DELETE(makeReq("/api/companies/company-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "companies.suspend" })
    )
  })
})

// ─── POST /api/companies/[id]/members ─────────────────────────────────────────

describe("POST /api/companies/[id]/members", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid body", async () => {
    const { POST } = await import("@/app/api/companies/[id]/members/route")
    const res = await POST(
      makeReq("/api/companies/company-1/members", "POST", {
        json: async () => ({ primaryRole: "cashier" }), // missing userId
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 409 when membership already exists", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "existing-m" }])
    const { POST } = await import("@/app/api/companies/[id]/members/route")
    const res = await POST(
      makeReq("/api/companies/company-1/members", "POST", {
        json: async () => ({
          userId: "00000000-0000-0000-0000-000000000002",
          primaryRole: "cashier",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(409)
  })

  it("creates membership and returns 201 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([]) // no existing membership
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "m-new",
        userId: "00000000-0000-0000-0000-000000000002",
        primaryRole: "cashier",
        status: "INVITED",
      },
    ])
    const { POST } = await import("@/app/api/companies/[id]/members/route")
    const res = await POST(
      makeReq("/api/companies/company-1/members", "POST", {
        json: async () => ({
          userId: "00000000-0000-0000-0000-000000000002",
          primaryRole: "cashier",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "companies.members.add" })
    )
  })
})

// ─── DELETE /api/companies/[id]/members/[userId] ──────────────────────────────

describe("DELETE /api/companies/[id]/members/[userId]", () => {
  beforeEach(resetMocks)

  it("returns 422 when removing own membership", async () => {
    const { DELETE } = await import("@/app/api/companies/[id]/members/[userId]/route")
    const res = await DELETE(makeReq("/api/companies/company-1/members/user-1", "DELETE"), webCtx)
    expect(res.status).toBe(422)
  })

  it("returns 404 when membership not found", async () => {
    mockDb.returning.mockResolvedValueOnce([])
    const { DELETE } = await import("@/app/api/companies/[id]/members/[userId]/route")
    const res = await DELETE(makeReq("/api/companies/company-1/members/user-2", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("deactivates membership and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "m-1", status: "INACTIVE" }])
    const { DELETE } = await import("@/app/api/companies/[id]/members/[userId]/route")
    const res = await DELETE(makeReq("/api/companies/company-1/members/user-2", "DELETE"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("INACTIVE")
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "companies.members.remove" })
    )
  })
})

// ─── PATCH /api/approvals/[id] ────────────────────────────────────────────────

describe("PATCH /api/approvals/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when approval not found", async () => {
    const { PATCH } = await import("@/app/api/approvals/[id]/route")
    const res = await PATCH(
      makeReq("/api/approvals/apr-1/", "PATCH", {
        json: async () => ({ action: "approve" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 422 for invalid action", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "apr-1" }])
    const { PATCH } = await import("@/app/api/approvals/[id]/route")
    const res = await PATCH(
      makeReq("/api/approvals/apr-1/", "PATCH", {
        json: async () => ({ action: "ignore" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("approves request and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "apr-1" }])
    const { PATCH } = await import("@/app/api/approvals/[id]/route")
    const res = await PATCH(
      makeReq("/api/approvals/apr-1/", "PATCH", {
        json: async () => ({ action: "approve", comment: "LGTM" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "approvals.approve" })
    )
  })
})

// ─── POST /api/attendance ─────────────────────────────────────────────────────

describe("POST /api/attendance", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/attendance/route")
    const res = await POST(
      makeReq("/api/attendance", "POST", {
        json: async () => ({ status: "present" }), // missing userId and date
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("creates attendance record and returns 201 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "att-new" }])
    const { POST } = await import("@/app/api/attendance/route")
    const res = await POST(
      makeReq("/api/attendance", "POST", {
        json: async () => ({
          userId: "00000000-0000-0000-0000-000000000002",
          date: "2026-06-10",
          status: "present",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("att-new")
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "attendance.create" })
    )
  })
})

// ─── PATCH /api/attendance/[id] ───────────────────────────────────────────────

describe("PATCH /api/attendance/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for empty body", async () => {
    const { PATCH } = await import("@/app/api/attendance/[id]/route")
    const res = await PATCH(
      makeReq("/api/attendance/att-1", "PATCH", {
        json: async () => ({}),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when record not found", async () => {
    const { PATCH } = await import("@/app/api/attendance/[id]/route")
    const res = await PATCH(
      makeReq("/api/attendance/att-1", "PATCH", {
        json: async () => ({ status: "late" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates record and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "att-1", userId: "user-2", status: "present" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "att-1", status: "late" }])
    const { PATCH } = await import("@/app/api/attendance/[id]/route")
    const res = await PATCH(
      makeReq("/api/attendance/att-1", "PATCH", {
        json: async () => ({ status: "late" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "attendance.update" })
    )
  })
})
