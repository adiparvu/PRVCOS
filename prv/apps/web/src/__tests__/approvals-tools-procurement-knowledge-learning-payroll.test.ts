import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
}))

vi.mock("@prv/approval-engine", () => ({
  processApproval: vi.fn().mockResolvedValue(undefined),
  escalateApproval: vi.fn().mockResolvedValue(undefined),
  delegateApproval: vi.fn().mockResolvedValue(undefined),
  ApprovalNotFoundError: class ApprovalNotFoundError extends Error {
    constructor(msg?: string) {
      super(msg)
      this.name = "ApprovalNotFoundError"
    }
  },
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "1" }]),
  values: vi.fn().mockResolvedValue([{ id: "1" }]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  approvalRequests: {},
  users: {},
  tools: {},
  stores: {},
  auditLogs: {},
  purchaseOrders: {},
  projects: {},
  knowledgeArticles: {},
  articleReadProgress: {},
  learningCourses: {},
  courseEnrollments: {},
  payrollRuns: {},
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
    count: vi.fn(),
    gte: vi.fn(),
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
  mockDb.insert.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockReturnThis()
  mockDb.set.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.returning.mockResolvedValue([{ id: "1" }])
  mockDb.values.mockResolvedValue([{ id: "1" }])
}

// ─── Approvals PATCH ──────────────────────────────────────────────────────────

describe("PATCH /api/approvals/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid action payload", async () => {
    const { PATCH } = await import("@/app/api/approvals/[id]/route")
    const res = await PATCH(
      makeReq("/api/approvals/approval-1", "PATCH", {
        json: async () => ({ action: "invalid_action" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when approval not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { PATCH } = await import("@/app/api/approvals/[id]/route")
    const res = await PATCH(
      makeReq("/api/approvals/approval-1", "PATCH", {
        json: async () => ({ action: "approve" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("approves a request and returns 200 with ok: true", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "approval-1" }])

    const { PATCH } = await import("@/app/api/approvals/[id]/route")
    const res = await PATCH(
      makeReq("/api/approvals/approval-1", "PATCH", {
        json: async () => ({ action: "approve", comment: "Looks good" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("fires audit log with action approvals.approve", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "approval-1" }])

    const { PATCH } = await import("@/app/api/approvals/[id]/route")
    await PATCH(
      makeReq("/api/approvals/approval-1", "PATCH", {
        json: async () => ({ action: "approve" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "approvals.approve" })
    )
  })

  it("returns 409 when approval engine throws ApprovalNotFoundError", async () => {
    const { processApproval, ApprovalNotFoundError } = await import("@prv/approval-engine")
    mockDb.limit.mockResolvedValueOnce([{ id: "approval-1" }])
    vi.mocked(processApproval).mockRejectedValueOnce(new ApprovalNotFoundError("gone"))

    const { PATCH } = await import("@/app/api/approvals/[id]/route")
    const res = await PATCH(
      makeReq("/api/approvals/approval-1", "PATCH", {
        json: async () => ({ action: "reject", comment: "denied" }),
      }),
      webCtx
    )
    expect(res.status).toBe(409)
  })

  it("fires audit log with action approvals.escalate", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "approval-1" }])

    const { PATCH } = await import("@/app/api/approvals/[id]/route")
    await PATCH(
      makeReq("/api/approvals/approval-1", "PATCH", {
        json: async () => ({ action: "escalate" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "approvals.escalate" })
    )
  })
})

// ─── Tools PATCH ─────────────────────────────────────────────────────────────

describe("PATCH /api/tools/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 when no fields provided", async () => {
    const { PATCH } = await import("@/app/api/tools/[id]/route")
    const res = await PATCH(
      makeReq("/api/tools/tool-1", "PATCH", {
        json: async () => ({}),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when tool not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { PATCH } = await import("@/app/api/tools/[id]/route")
    const res = await PATCH(
      makeReq("/api/tools/tool-1", "PATCH", {
        json: async () => ({ status: "maintenance" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates tool status and returns 200 with updated record", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "tool-1", name: "Drill", status: "available" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "tool-1", status: "maintenance" }])

    const { PATCH } = await import("@/app/api/tools/[id]/route")
    const res = await PATCH(
      makeReq("/api/tools/tool-1", "PATCH", {
        json: async () => ({ status: "maintenance" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("maintenance")
  })

  it("fires audit log with action tools.update", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "tool-1", name: "Drill", status: "available" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "tool-1", status: "in_use" }])

    const { PATCH } = await import("@/app/api/tools/[id]/route")
    await PATCH(
      makeReq("/api/tools/tool-1", "PATCH", {
        json: async () => ({ status: "in_use" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "tools.update" }))
  })
})

// ─── Procurement DELETE ───────────────────────────────────────────────────────

describe("DELETE /api/procurement/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when PO not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/procurement/[id]/route")
    const res = await DELETE(makeReq("/api/procurement/po-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("returns 409 when PO status is approved (non-deletable)", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "po-1", status: "approved", ref: "PO-001" }])

    const { DELETE } = await import("@/app/api/procurement/[id]/route")
    const res = await DELETE(makeReq("/api/procurement/po-1"), webCtx)
    expect(res.status).toBe(409)
  })

  it("soft-deletes draft PO and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "po-1", status: "draft", ref: "PO-001" }])

    const { DELETE } = await import("@/app/api/procurement/[id]/route")
    const res = await DELETE(makeReq("/api/procurement/po-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("soft-deletes rejected PO and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "po-1", status: "rejected", ref: "PO-001" }])

    const { DELETE } = await import("@/app/api/procurement/[id]/route")
    const res = await DELETE(makeReq("/api/procurement/po-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action procurement.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "po-1", status: "draft", ref: "PO-001" }])

    const { DELETE } = await import("@/app/api/procurement/[id]/route")
    await DELETE(makeReq("/api/procurement/po-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "procurement.delete" })
    )
  })

  it("returns 400 when ID missing from path", async () => {
    const { DELETE } = await import("@/app/api/procurement/[id]/route")
    const res = await DELETE(makeReq("/api/procurement/"), webCtx)
    expect(res.status).toBe(400)
  })
})

// ─── Procurement PATCH ────────────────────────────────────────────────────────

describe("PATCH /api/procurement/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for unknown action", async () => {
    const { PATCH } = await import("@/app/api/procurement/[id]/route")
    const res = await PATCH(
      makeReq("/api/procurement/po-1", "PATCH", {
        json: async () => ({ action: "cancel" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when PO not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { PATCH } = await import("@/app/api/procurement/[id]/route")
    const res = await PATCH(
      makeReq("/api/procurement/po-1", "PATCH", {
        json: async () => ({ action: "submit" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 409 when transition is invalid (approve from draft)", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "po-1", status: "draft", ref: "PO-001" }])

    const { PATCH } = await import("@/app/api/procurement/[id]/route")
    const res = await PATCH(
      makeReq("/api/procurement/po-1", "PATCH", {
        json: async () => ({ action: "approve" }),
      }),
      webCtx
    )
    expect(res.status).toBe(409)
  })

  it("submits draft PO and returns 200 with updated status", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "po-1", status: "draft", ref: "PO-001" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "po-1", status: "pending" }])

    const { PATCH } = await import("@/app/api/procurement/[id]/route")
    const res = await PATCH(
      makeReq("/api/procurement/po-1", "PATCH", {
        json: async () => ({ action: "submit" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("pending")
  })
})

// ─── Knowledge DELETE ─────────────────────────────────────────────────────────

describe("DELETE /api/knowledge/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when article not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/knowledge/[id]/route")
    const res = await DELETE(makeReq("/api/knowledge/article-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes article and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "article-1", title: "SOP Document" }])

    const { DELETE } = await import("@/app/api/knowledge/[id]/route")
    const res = await DELETE(makeReq("/api/knowledge/article-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action knowledge.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "article-1", title: "SOP Document" }])

    const { DELETE } = await import("@/app/api/knowledge/[id]/route")
    await DELETE(makeReq("/api/knowledge/article-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "knowledge.delete" })
    )
  })
})

// ─── Learning DELETE ──────────────────────────────────────────────────────────

describe("DELETE /api/learning/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when course not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/learning/[id]/route")
    const res = await DELETE(makeReq("/api/learning/course-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes course and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "course-1", title: "Safety Training" }])

    const { DELETE } = await import("@/app/api/learning/[id]/route")
    const res = await DELETE(makeReq("/api/learning/course-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action learning.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "course-1", title: "Safety Training" }])

    const { DELETE } = await import("@/app/api/learning/[id]/route")
    await DELETE(makeReq("/api/learning/course-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "learning.delete" })
    )
  })
})

// ─── Payroll PATCH ────────────────────────────────────────────────────────────

describe("PATCH /api/payroll/[id]", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid action", async () => {
    const { PATCH } = await import("@/app/api/payroll/[id]/route")
    const res = await PATCH(
      makeReq("/api/payroll/run-1", "PATCH", {
        json: async () => ({ action: "cancel" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when payroll run not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { PATCH } = await import("@/app/api/payroll/[id]/route")
    const res = await PATCH(
      makeReq("/api/payroll/run-1", "PATCH", {
        json: async () => ({ action: "start_processing" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("returns 409 when transition is invalid (start_processing from done)", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "run-1", status: "done", ref: "PAY-001" }])

    const { PATCH } = await import("@/app/api/payroll/[id]/route")
    const res = await PATCH(
      makeReq("/api/payroll/run-1", "PATCH", {
        json: async () => ({ action: "start_processing" }),
      }),
      webCtx
    )
    expect(res.status).toBe(409)
  })

  it("starts processing pending run and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "run-1", status: "pending", ref: "PAY-001" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "run-1", status: "processing" }])

    const { PATCH } = await import("@/app/api/payroll/[id]/route")
    const res = await PATCH(
      makeReq("/api/payroll/run-1", "PATCH", {
        json: async () => ({ action: "start_processing" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("processing")
  })

  it("fires audit log with action payroll.approve", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "run-1", status: "pending", ref: "PAY-001" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "run-1", status: "processing" }])

    const { PATCH } = await import("@/app/api/payroll/[id]/route")
    await PATCH(
      makeReq("/api/payroll/run-1", "PATCH", {
        json: async () => ({ action: "start_processing" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "payroll.approve" })
    )
  })
})
