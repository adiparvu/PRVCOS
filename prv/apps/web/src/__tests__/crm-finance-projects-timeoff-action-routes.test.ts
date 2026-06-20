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
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "item-1" }]),
  leftJoin: vi.fn().mockReturnThis(),
  then: (resolve: (val: unknown[]) => void) => resolve([]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  leaveRequests: {
    id: {},
    userId: {},
    companyId: {},
    type: {},
    status: {},
    startDate: {},
    endDate: {},
    notes: {},
    createdAt: {},
    approvedByUserId: {},
    deletedAt: {},
  },
  users: { id: {}, firstName: {}, lastName: {}, jobTitle: {}, storeId: {} },
  stores: { id: {}, name: {}, city: {} },
  auditLogs: {
    id: {},
    action: {},
    createdAt: {},
    companyId: {},
    entityId: {},
    entityType: {},
  },
  invoices: {
    id: {},
    companyId: {},
    deletedAt: {},
    status: {},
    invoiceNumber: {},
    total: {},
    clientId: {},
    projectId: {},
    currency: {},
    dueDate: {},
  },
  projects: {
    id: {},
    companyId: {},
    deletedAt: {},
    status: {},
    name: {},
    updatedAt: {},
    completedAt: {},
  },
  clients: { id: {}, companyId: {}, deletedAt: {} },
  anomalyDetections: {
    id: {},
    companyId: {},
    type: {},
    severity: {},
    domain: {},
    title: {},
    description: {},
    metric: {},
    actionLabel: {},
    href: {},
  },
  approvalRequests: { id: {}, companyId: {}, status: {} },
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
  mockDb.delete.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockReset()
  mockDb.limit.mockResolvedValue([])
  mockDb.set.mockReturnThis()
  mockDb.values.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.returning.mockReset()
  mockDb.returning.mockResolvedValue([{ id: "item-1" }])
  mockDb.leftJoin.mockReturnThis()
}

// ─── POST /api/crm/quotes/[id]/approval ───────────────────────────────────────

describe("POST /api/crm/quotes/[id]/approval", () => {
  beforeEach(resetMocks)

  it("returns 400 for invalid body (note is wrong type)", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/approval/route")
    const res = await POST(
      makeReq("/api/crm/quotes/quote-1/approval", "POST", {
        json: async () => ({ note: 123 }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 and logs audit event", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "quote-1", status: "draft", invoiceNumber: "Q-001", total: "5000" },
    ])
    mockDb.returning.mockResolvedValueOnce([{ id: "approval-1" }])
    const { POST } = await import("@/app/api/crm/quotes/[id]/approval/route")
    const res = await POST(
      makeReq("/api/crm/quotes/quote-1/approval", "POST", {
        json: async () => ({ note: "Looks good" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ─── POST /api/crm/quotes/[id]/convert ────────────────────────────────────────

describe("POST /api/crm/quotes/[id]/convert", () => {
  beforeEach(resetMocks)

  it("returns 400 for invalid body (projectName is wrong type)", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/convert/route")
    const res = await POST(
      makeReq("/api/crm/quotes/quote-1/convert", "POST", {
        json: async () => ({ projectName: 99 }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 with projectName on success", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "quote-1",
        status: "sent",
        invoiceNumber: "Q-001",
        total: "5000",
        clientId: "client-1",
        currency: "RON",
        dueDate: "2026-01-01",
        projectId: null,
      },
    ])
    mockDb.returning.mockResolvedValueOnce([{ id: "proj-1", name: "New Project" }])
    const { POST } = await import("@/app/api/crm/quotes/[id]/convert/route")
    const res = await POST(
      makeReq("/api/crm/quotes/quote-1/convert", "POST", {
        json: async () => ({ projectName: "New Project", note: "Converting now" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.projectName).toBe("New Project")
  })
})

// ─── POST /api/crm/quotes/[id]/decision ───────────────────────────────────────

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
        json: async () => ({ decision: "maybe" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 with accepted decision", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "quote-1", status: "draft" }])
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

  it("returns 200 with rejected decision", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "quote-1", status: "sent" }])
    const { POST } = await import("@/app/api/crm/quotes/[id]/decision/route")
    const res = await POST(
      makeReq("/api/crm/quotes/quote-1/decision", "POST", {
        json: async () => ({ decision: "rejected", note: "Out of budget" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.decision).toBe("rejected")
  })
})

// ─── POST /api/crm/quotes/[id]/send ───────────────────────────────────────────

describe("POST /api/crm/quotes/[id]/send", () => {
  beforeEach(resetMocks)

  it("returns 400 for invalid channel", async () => {
    const { POST } = await import("@/app/api/crm/quotes/[id]/send/route")
    const res = await POST(
      makeReq("/api/crm/quotes/quote-1/send", "POST", {
        json: async () => ({ channel: "fax" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 with default email channel", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "quote-1", status: "draft" }])
    const { POST } = await import("@/app/api/crm/quotes/[id]/send/route")
    const res = await POST(makeReq("/api/crm/quotes/quote-1/send"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.channel).toBe("email")
  })

  it("returns 200 with link channel", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "quote-1", status: "draft" }])
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
})

// ─── POST /api/finance/invoices/[id]/reminder ──────────────────────────────────

describe("POST /api/finance/invoices/[id]/reminder", () => {
  beforeEach(resetMocks)

  it("returns 400 for invalid channel", async () => {
    const { POST } = await import("@/app/api/finance/invoices/[id]/reminder/route")
    const res = await POST(
      makeReq("/api/finance/invoices/inv-1/reminder", "POST", {
        json: async () => ({ channel: "whatsapp" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 with default email channel", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "inv-1",
        status: "sent",
        invoiceNumber: "INV-001",
        total: "1000",
        currency: "RON",
        dueDate: "2026-01-01",
        clientId: "client-1",
        clientEmail: null,
        clientName: null,
      },
    ])
    const { POST } = await import("@/app/api/finance/invoices/[id]/reminder/route")
    const res = await POST(makeReq("/api/finance/invoices/inv-1/reminder"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.channel).toBe("email")
  })

  it("returns 200 with sms channel", async () => {
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "inv-1",
        status: "sent",
        invoiceNumber: "INV-001",
        total: "1000",
        currency: "RON",
        dueDate: "2026-01-01",
        clientId: "client-1",
        clientEmail: null,
        clientName: null,
      },
    ])
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
})

// ─── POST /api/projects/[id]/flag ─────────────────────────────────────────────

describe("POST /api/projects/[id]/flag", () => {
  beforeEach(resetMocks)

  it("returns 400 when required fields missing", async () => {
    const { POST } = await import("@/app/api/projects/[id]/flag/route")
    const res = await POST(makeReq("/api/projects/proj-1/flag"), webCtx)
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid type", async () => {
    const { POST } = await import("@/app/api/projects/[id]/flag/route")
    const res = await POST(
      makeReq("/api/projects/proj-1/flag", "POST", {
        json: async () => ({ type: "bad_type", severity: "low", note: "Issue noted" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 with type and severity on success", async () => {
    const { POST } = await import("@/app/api/projects/[id]/flag/route")
    const res = await POST(
      makeReq("/api/projects/proj-1/flag", "POST", {
        json: async () => ({
          type: "delay",
          severity: "high",
          note: "Two weeks behind schedule",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.type).toBe("delay")
    expect(body.severity).toBe("high")
  })
})

// ─── POST /api/projects/[id]/phase ────────────────────────────────────────────

describe("POST /api/projects/[id]/phase", () => {
  beforeEach(resetMocks)

  it("returns 400 when action is missing", async () => {
    const { POST } = await import("@/app/api/projects/[id]/phase/route")
    const res = await POST(makeReq("/api/projects/proj-1/phase"), webCtx)
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid action", async () => {
    const { POST } = await import("@/app/api/projects/[id]/phase/route")
    const res = await POST(
      makeReq("/api/projects/proj-1/phase", "POST", {
        json: async () => ({ action: "skip" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 with action advance", async () => {
    const { POST } = await import("@/app/api/projects/[id]/phase/route")
    const res = await POST(
      makeReq("/api/projects/proj-1/phase", "POST", {
        json: async () => ({ action: "advance" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.action).toBe("advance")
  })

  it("returns 200 with action revert", async () => {
    const { POST } = await import("@/app/api/projects/[id]/phase/route")
    const res = await POST(
      makeReq("/api/projects/proj-1/phase", "POST", {
        json: async () => ({ action: "revert", note: "Going back to planning" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.action).toBe("revert")
  })
})

// ─── POST /api/people/time-off/[id] ───────────────────────────────────────────

describe("POST /api/people/time-off/[id]", () => {
  beforeEach(resetMocks)

  it("returns 400 when action is missing", async () => {
    const { POST } = await import("@/app/api/people/time-off/[id]/route")
    const res = await POST(makeReq("/api/people/time-off/req-1"), webCtx)
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid action value", async () => {
    const { POST } = await import("@/app/api/people/time-off/[id]/route")
    const res = await POST(
      makeReq("/api/people/time-off/req-1", "POST", {
        json: async () => ({ action: "cancel" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 on approve", async () => {
    const { POST } = await import("@/app/api/people/time-off/[id]/route")
    const res = await POST(
      makeReq("/api/people/time-off/req-1", "POST", {
        json: async () => ({ action: "approve" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.action).toBe("approve")
  })

  it("returns 200 on decline with reason", async () => {
    const { POST } = await import("@/app/api/people/time-off/[id]/route")
    const res = await POST(
      makeReq("/api/people/time-off/req-1", "POST", {
        json: async () => ({ action: "decline", reason: "Business critical period" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.action).toBe("decline")
  })
})
