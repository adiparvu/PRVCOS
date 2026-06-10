import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  set: vi.fn().mockReturnThis(),
  then: (resolve: (val: unknown[]) => void) => resolve([]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  leaveRequests: {},
  users: {},
  stores: {},
  auditLogs: {},
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    desc: vi.fn(),
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
  vi.clearAllMocks()
  mockDb.select.mockReturnThis()
  mockDb.update.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockResolvedValue([])
  mockDb.set.mockReturnThis()
}

// ─── POST /api/crm/quotes/[id]/approval ──────────────────────────────────────

describe("POST /api/crm/quotes/[id]/approval", () => {
  beforeEach(resetMocks)

  it("returns 400 for invalid note type", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/approval/route")
    const res = await POST(
      makeReq("/api/crm/quotes/quote-1/approval", "POST", {
        json: async () => ({ note: 123 }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 with success:true for valid body", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/approval/route")
    const res = await POST(
      makeReq("/api/crm/quotes/quote-1/approval", "POST", {
        json: async () => ({ note: "Pending manager review" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("returns 200 with empty body (all optional)", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/approval/route")
    const res = await POST(makeReq("/api/crm/quotes/quote-1/approval"), webCtx)
    expect(res.status).toBe(200)
  })

  it("fires audit log with action crm.quote.approval.requested", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/crm/quotes/[id]/approval/route")
    await POST(makeReq("/api/crm/quotes/quote-1/approval"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.quote.approval.requested" })
    )
  })
})

// ─── POST /api/crm/quotes/[id]/convert ───────────────────────────────────────

describe("POST /api/crm/quotes/[id]/convert", () => {
  beforeEach(resetMocks)

  it("returns 400 for invalid projectName type", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/convert/route")
    const res = await POST(
      makeReq("/api/crm/quotes/quote-1/convert", "POST", {
        json: async () => ({ projectName: 999 }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 with success:true and projectName echoed", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/convert/route")
    const res = await POST(
      makeReq("/api/crm/quotes/quote-1/convert", "POST", {
        json: async () => ({ projectName: "New Build Phase 2" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.projectName).toBe("New Build Phase 2")
  })

  it("returns 200 with empty body (all optional)", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/convert/route")
    const res = await POST(makeReq("/api/crm/quotes/quote-1/convert"), webCtx)
    expect(res.status).toBe(200)
  })

  it("fires audit log with action crm.quote.converted", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/crm/quotes/[id]/convert/route")
    await POST(makeReq("/api/crm/quotes/quote-1/convert"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.quote.converted" })
    )
  })
})

// ─── POST /api/crm/quotes/[id]/decision ──────────────────────────────────────

describe("POST /api/crm/quotes/[id]/decision", () => {
  beforeEach(resetMocks)

  it("returns 400 when decision is missing", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/decision/route")
    const res = await POST(makeReq("/api/crm/quotes/quote-1/decision"), webCtx)
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid decision value", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/decision/route")
    const res = await POST(
      makeReq("/api/crm/quotes/quote-1/decision", "POST", {
        json: async () => ({ decision: "pending" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 with success:true and decision echoed for accepted", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/decision/route")
    const res = await POST(
      makeReq("/api/crm/quotes/quote-1/decision", "POST", {
        json: async () => ({ decision: "accepted" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.decision).toBe("accepted")
  })

  it("fires audit log with action crm.quote.rejected for rejected decision", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/crm/quotes/[id]/decision/route")
    await POST(
      makeReq("/api/crm/quotes/quote-1/decision", "POST", {
        json: async () => ({ decision: "rejected" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.quote.rejected" })
    )
  })
})

// ─── POST /api/crm/quotes/[id]/send ──────────────────────────────────────────

describe("POST /api/crm/quotes/[id]/send", () => {
  beforeEach(resetMocks)

  it("returns 400 for invalid channel enum", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/send/route")
    const res = await POST(
      makeReq("/api/crm/quotes/quote-1/send", "POST", {
        json: async () => ({ channel: "fax" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 with default channel email when body is empty", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/send/route")
    const res = await POST(makeReq("/api/crm/quotes/quote-1/send"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.channel).toBe("email")
  })

  it("returns 200 with channel:link when specified", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/send/route")
    const res = await POST(
      makeReq("/api/crm/quotes/quote-1/send", "POST", {
        json: async () => ({ channel: "link" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.channel).toBe("link")
  })

  it("fires audit log with action crm.quote.send", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/crm/quotes/[id]/send/route")
    await POST(makeReq("/api/crm/quotes/quote-1/send"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.quote.send" })
    )
  })
})

// ─── POST /api/finance/invoices/[id]/reminder ────────────────────────────────

describe("POST /api/finance/invoices/[id]/reminder", () => {
  beforeEach(resetMocks)

  it("returns 400 for invalid channel enum", async () => {
    const { POST } = await import("@/app/api/finance/invoices/[id]/reminder/route")
    const res = await POST(
      makeReq("/api/finance/invoices/inv-1/reminder", "POST", {
        json: async () => ({ channel: "smoke_signal" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 with default channel email when body is empty", async () => {
    const { POST } = await import("@/app/api/finance/invoices/[id]/reminder/route")
    const res = await POST(makeReq("/api/finance/invoices/inv-1/reminder"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.channel).toBe("email")
  })

  it("returns 200 with channel:sms when specified", async () => {
    const { POST } = await import("@/app/api/finance/invoices/[id]/reminder/route")
    const res = await POST(
      makeReq("/api/finance/invoices/inv-1/reminder", "POST", {
        json: async () => ({ channel: "sms" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.channel).toBe("sms")
  })

  it("fires audit log with action finance.invoice.reminder", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/finance/invoices/[id]/reminder/route")
    await POST(makeReq("/api/finance/invoices/inv-1/reminder"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "finance.invoice.reminder" })
    )
  })
})

// ─── POST /api/projects/[id]/flag ────────────────────────────────────────────

describe("POST /api/projects/[id]/flag", () => {
  beforeEach(resetMocks)

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("@/app/api/projects/[id]/flag/route")
    const res = await POST(makeReq("/api/projects/proj-1/flag"), webCtx)
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid type enum", async () => {
    const { POST } = await import("@/app/api/projects/[id]/flag/route")
    const res = await POST(
      makeReq("/api/projects/proj-1/flag", "POST", {
        json: async () => ({ type: "unknown_risk", severity: "high", note: "test" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 with success:true and echoes type and severity", async () => {
    const { POST } = await import("@/app/api/projects/[id]/flag/route")
    const res = await POST(
      makeReq("/api/projects/proj-1/flag", "POST", {
        json: async () => ({ type: "budget_risk", severity: "high", note: "Over budget by 20%" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.type).toBe("budget_risk")
    expect(body.severity).toBe("high")
  })

  it("fires audit log with action projects.flag.delay", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/projects/[id]/flag/route")
    await POST(
      makeReq("/api/projects/proj-1/flag", "POST", {
        json: async () => ({ type: "delay", severity: "medium", note: "Supply chain issue" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "projects.flag.delay" })
    )
  })
})

// ─── POST /api/projects/[id]/phase ───────────────────────────────────────────

describe("POST /api/projects/[id]/phase", () => {
  beforeEach(resetMocks)

  it("returns 400 when action is missing", async () => {
    const { POST } = await import("@/app/api/projects/[id]/phase/route")
    const res = await POST(makeReq("/api/projects/proj-1/phase"), webCtx)
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid action value", async () => {
    const { POST } = await import("@/app/api/projects/[id]/phase/route")
    const res = await POST(
      makeReq("/api/projects/proj-1/phase", "POST", {
        json: async () => ({ action: "skip" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 with success:true and echoes action", async () => {
    const { POST } = await import("@/app/api/projects/[id]/phase/route")
    const res = await POST(
      makeReq("/api/projects/proj-1/phase", "POST", {
        json: async () => ({ action: "advance", note: "Milestone reached" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.action).toBe("advance")
  })

  it("fires audit log with action projects.phase.revert", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/projects/[id]/phase/route")
    await POST(
      makeReq("/api/projects/proj-1/phase", "POST", {
        json: async () => ({ action: "revert" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "projects.phase.revert" })
    )
  })
})

// ─── DELETE /api/people/time-off/[id] ────────────────────────────────────────

describe("DELETE /api/people/time-off/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when request not found", async () => {
    const { DELETE } = await import("@/app/api/people/time-off/[id]/route")
    const res = await DELETE(makeReq("/api/people/time-off/req-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("returns 409 when request status is not pending", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "req-1", status: "approved", userId: "user-1" }])
    const { DELETE } = await import("@/app/api/people/time-off/[id]/route")
    const res = await DELETE(makeReq("/api/people/time-off/req-1", "DELETE"), webCtx)
    expect(res.status).toBe(409)
  })

  it("soft-deletes and returns 204 for pending request", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "req-1", status: "pending", userId: "user-1" }])
    const { DELETE } = await import("@/app/api/people/time-off/[id]/route")
    const res = await DELETE(makeReq("/api/people/time-off/req-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log on successful delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "req-1", status: "pending", userId: "user-1" }])
    const { DELETE } = await import("@/app/api/people/time-off/[id]/route")
    await DELETE(makeReq("/api/people/time-off/req-1", "DELETE"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "hr.time_off.delete" })
    )
  })
})
