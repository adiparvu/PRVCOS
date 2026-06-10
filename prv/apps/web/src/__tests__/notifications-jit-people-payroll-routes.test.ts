import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
  RoleSets: { admin: [], management: [] },
  hasScope: vi.fn().mockReturnValue(true),
}))

vi.mock("@prv/approval-engine", () => ({
  submitForApproval: vi.fn().mockResolvedValue("apr-new"),
  processApproval: vi.fn().mockResolvedValue(undefined),
  escalateApproval: vi.fn().mockResolvedValue(undefined),
  delegateApproval: vi.fn().mockResolvedValue(undefined),
  ApprovalNotFoundError: class ApprovalNotFoundError extends Error {},
}))

vi.mock("@prv/jobs", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
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
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  notifications: {},
  users: {},
  payrollRuns: {},
  sysadminAccessSessions: {},
  approvalRequests: {},
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
    ne: vi.fn(),
    inArray: vi.fn(),
    notInArray: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    lt: vi.fn(),
    or: vi.fn(),
    count: vi.fn(),
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
  vi.resetAllMocks()
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

// ─── POST /api/notifications ──────────────────────────────────────────────────

describe("POST /api/notifications", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/notifications/route")
    const res = await POST(makeReq("/api/notifications"), webCtx)
    expect(res.status).toBe(422)
  })

  it("creates notification and returns 201 with id", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "notif-new" }])
    const { POST } = await import("@/app/api/notifications/route")
    const res = await POST(
      makeReq("/api/notifications", "POST", {
        json: async () => ({
          userId: "00000000-0000-0000-0000-000000000099",
          title: "Test Notification",
          type: "info",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("notif-new")
  })

  it("fires audit log with action notifications.dispatch", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "notif-new" }])
    const { POST } = await import("@/app/api/notifications/route")
    await POST(
      makeReq("/api/notifications", "POST", {
        json: async () => ({
          userId: "00000000-0000-0000-0000-000000000099",
          title: "Alert",
          type: "warning",
        }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "notifications.dispatch" })
    )
  })
})

// ─── PATCH /api/notifications/[id] ───────────────────────────────────────────

describe("PATCH /api/notifications/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 when nothing to update", async () => {
    const { PATCH } = await import("@/app/api/notifications/[id]/route")
    const res = await PATCH(
      makeReq("/api/notifications/notif-1", "PATCH", {
        json: async () => ({}),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when notification not found", async () => {
    mockDb.returning.mockResolvedValueOnce([])
    const { PATCH } = await import("@/app/api/notifications/[id]/route")
    const res = await PATCH(
      makeReq("/api/notifications/notif-1", "PATCH", {
        json: async () => ({ isRead: true }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("marks notification as read and returns 200", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "notif-1", isRead: true, isDismissed: false }])
    const { PATCH } = await import("@/app/api/notifications/[id]/route")
    const res = await PATCH(
      makeReq("/api/notifications/notif-1", "PATCH", {
        json: async () => ({ isRead: true }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isRead).toBe(true)
  })
})

// ─── DELETE /api/notifications/[id] ──────────────────────────────────────────

describe("DELETE /api/notifications/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when notification not found", async () => {
    const { DELETE } = await import("@/app/api/notifications/[id]/route")
    const res = await DELETE(makeReq("/api/notifications/notif-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes notification and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "notif-1" }])
    const { DELETE } = await import("@/app/api/notifications/[id]/route")
    const res = await DELETE(makeReq("/api/notifications/notif-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action notifications.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "notif-1" }])
    const { DELETE } = await import("@/app/api/notifications/[id]/route")
    await DELETE(makeReq("/api/notifications/notif-1", "DELETE"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "notifications.delete" })
    )
  })
})

// ─── POST /api/jit/request ────────────────────────────────────────────────────

describe("POST /api/jit/request", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing or short justification", async () => {
    const { POST } = await import("@/app/api/jit/request/route")
    const res = await POST(
      makeReq("/api/jit/request", "POST", {
        json: async () => ({ justification: "short" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("creates JIT session and returns 201 with id and status", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "jit-new", status: "pending" }])
    const { POST } = await import("@/app/api/jit/request/route")
    const res = await POST(
      makeReq("/api/jit/request", "POST", {
        json: async () => ({
          justification: "Need temporary access to investigate a critical production issue.",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("jit-new")
    expect(body.status).toBe("pending")
  })

  it("fires audit log with action jit.request", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "jit-new", status: "pending" }])
    const { POST } = await import("@/app/api/jit/request/route")
    await POST(
      makeReq("/api/jit/request", "POST", {
        json: async () => ({
          justification: "Need temporary access to investigate a critical production issue.",
        }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "jit.request" }))
  })
})

// ─── POST /api/jit/approve ────────────────────────────────────────────────────

describe("POST /api/jit/approve", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing sessionId", async () => {
    const { POST } = await import("@/app/api/jit/approve/route")
    const res = await POST(makeReq("/api/jit/approve"), webCtx)
    expect(res.status).toBe(422)
  })

  it("returns 404 when JIT session not found", async () => {
    const { POST } = await import("@/app/api/jit/approve/route")
    const res = await POST(
      makeReq("/api/jit/approve", "POST", {
        json: async () => ({ sessionId: "00000000-0000-0000-0000-000000000001" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns first-approval pending status", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "jit-1",
        status: "pending",
        requestedBy: "other-user",
        approverId1: null,
      },
    ])
    const { POST } = await import("@/app/api/jit/approve/route")
    const res = await POST(
      makeReq("/api/jit/approve", "POST", {
        json: async () => ({ sessionId: "00000000-0000-0000-0000-000000000001" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("pending")
    expect(body.approvals).toBe(1)
  })

  it("fires audit log with action jit.approve.first", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([
      { id: "jit-1", status: "pending", requestedBy: "other-user", approverId1: null },
    ])
    const { POST } = await import("@/app/api/jit/approve/route")
    await POST(
      makeReq("/api/jit/approve", "POST", {
        json: async () => ({ sessionId: "00000000-0000-0000-0000-000000000001" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "jit.approve.first" })
    )
  })
})

// ─── PATCH /api/people/[id] ───────────────────────────────────────────────────

describe("PATCH /api/people/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when person not found", async () => {
    // limit returns [] by default
    const { PATCH } = await import("@/app/api/people/[id]/route")
    const res = await PATCH(
      makeReq("/api/people/person-1", "PATCH", {
        json: async () => ({ firstName: "Updated" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates person and returns 200 with id", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "person-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "person-1" }])
    const { PATCH } = await import("@/app/api/people/[id]/route")
    const res = await PATCH(
      makeReq("/api/people/person-1", "PATCH", {
        json: async () => ({ firstName: "Updated" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe("person-1")
  })

  it("fires audit log with action people.update", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "person-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "person-1" }])
    const { PATCH } = await import("@/app/api/people/[id]/route")
    await PATCH(
      makeReq("/api/people/person-1", "PATCH", {
        json: async () => ({ jobTitle: "Senior Dev" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "people.update" }))
  })
})

// ─── DELETE /api/people/[id] ──────────────────────────────────────────────────

describe("DELETE /api/people/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when person not found", async () => {
    const { DELETE } = await import("@/app/api/people/[id]/route")
    const res = await DELETE(makeReq("/api/people/person-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("deactivates person and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "person-1" }])
    const { DELETE } = await import("@/app/api/people/[id]/route")
    const res = await DELETE(makeReq("/api/people/person-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action people.deactivate", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "person-1" }])
    const { DELETE } = await import("@/app/api/people/[id]/route")
    await DELETE(makeReq("/api/people/person-1", "DELETE"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "people.deactivate" })
    )
  })
})

// ─── POST /api/payroll/runs ───────────────────────────────────────────────────

describe("POST /api/payroll/runs", () => {
  beforeEach(resetMocks)

  it("returns 400 for missing startDate or endDate", async () => {
    const { POST } = await import("@/app/api/payroll/runs/route")
    const res = await POST(makeReq("/api/payroll/runs"), webCtx)
    expect(res.status).toBe(400)
  })

  it("creates payroll run and returns 201 with run object", async () => {
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "pr-new",
        ref: "PR-123",
        title: "Payroll Run Feb 2025",
        employeeCount: 0,
        totalGross: "0",
        netPaid: "0",
        status: "pending",
        type: "weekly",
      },
    ])
    const { POST } = await import("@/app/api/payroll/runs/route")
    const res = await POST(
      makeReq("/api/payroll/runs", "POST", {
        json: async () => ({ startDate: "2025-02-01", endDate: "2025-02-28" }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.run.id).toBe("pr-new")
  })

  it("fires audit log with action payroll.runs.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "pr-new",
        ref: "PR-123",
        title: "T",
        employeeCount: 0,
        totalGross: "0",
        netPaid: "0",
        status: "pending",
        type: "weekly",
      },
    ])
    const { POST } = await import("@/app/api/payroll/runs/route")
    await POST(
      makeReq("/api/payroll/runs", "POST", {
        json: async () => ({ startDate: "2025-02-01", endDate: "2025-02-28" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "payroll.runs.create" })
    )
  })
})

// ─── PATCH /api/payroll/[id] ──────────────────────────────────────────────────

describe("PATCH /api/payroll/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid action", async () => {
    const { PATCH } = await import("@/app/api/payroll/[id]/route")
    const res = await PATCH(
      makeReq("/api/payroll/pr-1", "PATCH", {
        json: async () => ({ action: "invalid_action" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when payroll run not found", async () => {
    // limit returns [] → not found
    const { PATCH } = await import("@/app/api/payroll/[id]/route")
    const res = await PATCH(
      makeReq("/api/payroll/pr-1", "PATCH", {
        json: async () => ({ action: "start_processing" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("transitions payroll run and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "pr-1", status: "pending", ref: "PR-123" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "pr-1", status: "processing" }])
    const { PATCH } = await import("@/app/api/payroll/[id]/route")
    const res = await PATCH(
      makeReq("/api/payroll/pr-1", "PATCH", {
        json: async () => ({ action: "start_processing" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
  })

  it("fires audit log with action payroll.approve", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "pr-1", status: "pending", ref: "PR-123" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "pr-1", status: "processing" }])
    const { PATCH } = await import("@/app/api/payroll/[id]/route")
    await PATCH(
      makeReq("/api/payroll/pr-1", "PATCH", {
        json: async () => ({ action: "start_processing" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "payroll.approve" })
    )
  })
})

// ─── POST /api/approvals ──────────────────────────────────────────────────────

describe("POST /api/approvals", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/approvals/route")
    const res = await POST(makeReq("/api/approvals"), webCtx)
    expect(res.status).toBe(422)
  })

  it("creates approval and returns 201 with id", async () => {
    const { submitForApproval } = await import("@prv/approval-engine")
    vi.mocked(submitForApproval).mockResolvedValueOnce("apr-new")
    const { POST } = await import("@/app/api/approvals/route")
    const res = await POST(
      makeReq("/api/approvals", "POST", {
        json: async () => ({
          type: "purchase",
          title: "Office Supplies",
          ref: "PO-001",
          deadline: "2025-03-01T00:00:00Z",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("apr-new")
  })

  it("fires audit log with action approvals.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { submitForApproval } = await import("@prv/approval-engine")
    vi.mocked(submitForApproval).mockResolvedValueOnce("apr-new")
    const { POST } = await import("@/app/api/approvals/route")
    await POST(
      makeReq("/api/approvals", "POST", {
        json: async () => ({
          type: "leave",
          title: "Annual Leave",
          ref: "LV-002",
          deadline: "2025-04-01T00:00:00Z",
        }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "approvals.create" })
    )
  })
})
