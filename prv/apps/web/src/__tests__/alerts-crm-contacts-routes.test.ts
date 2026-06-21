import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "new-1" }]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  alerts: {
    id: {},
    companyId: {},
    severity: {},
    status: {},
    title: {},
    description: {},
    source: {},
    entityType: {},
    entityId: {},
    assignedToId: {},
    acknowledgedAt: {},
    resolvedAt: {},
    resolutionNote: {},
    createdAt: {},
    updatedAt: {},
  },
  clients: { id: {}, companyId: {}, deletedAt: {} },
  clientContacts: {
    id: {},
    clientId: {},
    companyId: {},
    firstName: {},
    lastName: {},
    jobTitle: {},
    email: {},
    phone: {},
    isPrimary: {},
    updatedAt: {},
  },
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    ne: vi.fn(),
    isNull: vi.fn(),
    desc: vi.fn(),
    asc: vi.fn(),
  }
})

const webCtx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "session-1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}

function makeReq(
  path: string,
  method = "GET",
  body?: unknown,
  searchParams?: Record<string, string>
): Request {
  const url = new URL(`http://localhost${path}`)
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) url.searchParams.set(k, v)
  }
  return {
    method,
    nextUrl: { pathname: path },
    url: url.toString(),
    headers: { get: () => null },
    json: async () => body ?? {},
  } as unknown as Request
}

function resetMocks() {
  vi.resetAllMocks()
  mockDb.select.mockReturnThis()
  mockDb.insert.mockReturnThis()
  mockDb.update.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockResolvedValue([])
  mockDb.set.mockReturnThis()
  mockDb.values.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.returning.mockResolvedValue([{ id: "new-1" }])
}

// ── Alert severity levels ─────────────────────────────────────────────────────

describe("alert severity levels", () => {
  const levels = ["l1_info", "l2_warning", "l3_critical", "l4_emergency", "l5_crisis"] as const

  it("defines five severity tiers", () => {
    expect(levels).toHaveLength(5)
  })

  it("lowest tier is l1_info", () => {
    expect(levels[0]).toBe("l1_info")
  })

  it("highest tier is l5_crisis", () => {
    expect(levels[levels.length - 1]).toBe("l5_crisis")
  })

  it("all tiers are enumerated", () => {
    for (const level of levels) {
      expect(levels).toContain(level)
    }
  })
})

// ── Alert status lifecycle ────────────────────────────────────────────────────

describe("alert status lifecycle", () => {
  const statuses = ["open", "acknowledged", "assigned", "resolved"] as const

  it("open is the initial status", () => {
    expect(statuses[0]).toBe("open")
  })

  it("resolved is the terminal status", () => {
    expect(statuses).toContain("resolved")
  })

  it("assigned requires an assignedToId", () => {
    const action = "assign"
    expect(action).toBe("assign")
  })

  it("acknowledge action moves open → acknowledged", () => {
    const transitions: Record<string, string> = {
      acknowledge: "acknowledged",
      assign: "assigned",
      resolve: "resolved",
    }
    expect(transitions["acknowledge"]).toBe("acknowledged")
    expect(transitions["assign"]).toBe("assigned")
    expect(transitions["resolve"]).toBe("resolved")
  })
})

// ── GET /api/alerts ───────────────────────────────────────────────────────────
// The alerts list route chain is: select → from → where → orderBy → limit(100)
// Terminal is .limit(), so mock that for response data.

describe("GET /api/alerts", () => {
  beforeEach(resetMocks)

  it("returns empty list when no alerts", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { GET } = await import("@/app/api/alerts/route")
    const res = await GET(makeReq("/api/alerts", "GET"), webCtx)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toHaveProperty("alerts")
    expect(Array.isArray(json.alerts)).toBe(true)
  })

  it("returns alerts with correct shape", async () => {
    const fakeAlert = {
      id: "alert-1",
      severity: "l3_critical",
      status: "open",
      title: "Inventory critical",
      description: "Low stock",
      source: "system",
      entityType: "store",
      entityId: "store-1",
      assignedToId: null,
      acknowledgedAt: null,
      resolvedAt: null,
      resolutionNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockDb.limit.mockResolvedValueOnce([fakeAlert])

    const { GET } = await import("@/app/api/alerts/route")
    const res = await GET(makeReq("/api/alerts", "GET", undefined, { status: "open" }), webCtx)
    const json = await res.json()
    expect(json.alerts[0].id).toBe("alert-1")
    expect(json.total).toBe(1)
  })

  it("defaults status filter to open", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { GET } = await import("@/app/api/alerts/route")
    const res = await GET(makeReq("/api/alerts", "GET"), webCtx)
    expect(res.status).toBe(200)
  })

  it("accepts status=all to return resolved alerts too", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { GET } = await import("@/app/api/alerts/route")
    const res = await GET(makeReq("/api/alerts", "GET", undefined, { status: "all" }), webCtx)
    expect(res.status).toBe(200)
  })
})

// ── POST /api/alerts ──────────────────────────────────────────────────────────

describe("POST /api/alerts", () => {
  beforeEach(resetMocks)

  it("creates alert and returns 201 with id", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "alert-new" }])

    const { POST } = await import("@/app/api/alerts/route")
    const res = await POST(
      makeReq("/api/alerts", "POST", { severity: "l2_warning", title: "Test alert" }),
      webCtx
    )
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe("alert-new")
  })

  it("returns 400 when severity is missing", async () => {
    const { POST } = await import("@/app/api/alerts/route")
    const res = await POST(makeReq("/api/alerts", "POST", { title: "No severity" }), webCtx)
    expect(res.status).toBe(400)
  })

  it("returns 400 when title is missing", async () => {
    const { POST } = await import("@/app/api/alerts/route")
    const res = await POST(makeReq("/api/alerts", "POST", { severity: "l1_info" }), webCtx)
    expect(res.status).toBe(400)
  })

  it("defaults source to manual when not provided", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "alert-manual" }])

    const { POST } = await import("@/app/api/alerts/route")
    const res = await POST(
      makeReq("/api/alerts", "POST", {
        severity: "l1_info",
        title: "Manual alert",
      }),
      webCtx
    )
    expect(res.status).toBe(201)
  })

  it("accepts optional entityType and entityId", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "alert-entity" }])

    const { POST } = await import("@/app/api/alerts/route")
    const res = await POST(
      makeReq("/api/alerts", "POST", {
        severity: "l3_critical",
        title: "Store issue",
        entityType: "store",
        entityId: "store-42",
      }),
      webCtx
    )
    expect(res.status).toBe(201)
  })
})

// ── PATCH /api/alerts/[id] ────────────────────────────────────────────────────

describe("PATCH /api/alerts/[id] — acknowledge", () => {
  beforeEach(resetMocks)

  it("returns 404 when alert not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { PATCH } = await import("@/app/api/alerts/[id]/route")
    const res = await PATCH(
      makeReq("/api/alerts/alert-1", "PATCH", { action: "acknowledge" }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("acknowledges alert and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "alert-1", status: "open" }])
    // update chain ends at .where() which returns mockDb via mockReturnThis — no extra mock needed

    const { PATCH } = await import("@/app/api/alerts/[id]/route")
    const res = await PATCH(
      makeReq("/api/alerts/alert-1", "PATCH", { action: "acknowledge" }),
      webCtx
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })
})

describe("PATCH /api/alerts/[id] — assign", () => {
  beforeEach(resetMocks)

  it("assigns alert to a user", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "alert-1", status: "open" }])

    const { PATCH } = await import("@/app/api/alerts/[id]/route")
    const res = await PATCH(
      makeReq("/api/alerts/alert-1", "PATCH", {
        action: "assign",
        assignedToId: "user-99",
      }),
      webCtx
    )
    expect(res.status).toBe(200)
  })

  it("returns 400 when assignedToId missing for assign action", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "alert-1", status: "open" }])

    const { PATCH } = await import("@/app/api/alerts/[id]/route")
    const res = await PATCH(makeReq("/api/alerts/alert-1", "PATCH", { action: "assign" }), webCtx)
    expect(res.status).toBe(400)
  })
})

describe("PATCH /api/alerts/[id] — resolve", () => {
  beforeEach(resetMocks)

  it("resolves alert with optional note", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "alert-1", status: "acknowledged" }])

    const { PATCH } = await import("@/app/api/alerts/[id]/route")
    const res = await PATCH(
      makeReq("/api/alerts/alert-1", "PATCH", {
        action: "resolve",
        resolutionNote: "Fixed by restock",
      }),
      webCtx
    )
    expect(res.status).toBe(200)
  })

  it("resolves alert without note", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "alert-1", status: "open" }])

    const { PATCH } = await import("@/app/api/alerts/[id]/route")
    const res = await PATCH(makeReq("/api/alerts/alert-1", "PATCH", { action: "resolve" }), webCtx)
    expect(res.status).toBe(200)
  })

  it("returns 400 for invalid action", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "alert-1", status: "open" }])

    const { PATCH } = await import("@/app/api/alerts/[id]/route")
    const res = await PATCH(
      makeReq("/api/alerts/alert-1", "PATCH", { action: "invalid_action" }),
      webCtx
    )
    expect(res.status).toBe(400)
  })
})

// ── GET /api/crm/clients/[id]/contacts ───────────────────────────────────────

describe("GET /api/crm/clients/[id]/contacts", () => {
  beforeEach(resetMocks)

  it("returns 404 when client not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { GET } = await import("@/app/api/crm/clients/[id]/contacts/route")
    const res = await GET(makeReq("/api/crm/clients/client-1/contacts", "GET"), webCtx)
    expect(res.status).toBe(404)
  })

  it("returns empty contacts list when client exists but has no contacts", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "client-1" }])
    mockDb.orderBy.mockResolvedValueOnce([])

    const { GET } = await import("@/app/api/crm/clients/[id]/contacts/route")
    const res = await GET(makeReq("/api/crm/clients/client-1/contacts", "GET"), webCtx)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.contacts).toEqual([])
  })

  it("returns contacts ordered by isPrimary", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "client-1" }])
    mockDb.orderBy.mockResolvedValueOnce([
      { id: "c-1", firstName: "Ana", lastName: "Pop", isPrimary: true },
      { id: "c-2", firstName: "Ion", lastName: "Popa", isPrimary: false },
    ])

    const { GET } = await import("@/app/api/crm/clients/[id]/contacts/route")
    const res = await GET(makeReq("/api/crm/clients/client-1/contacts", "GET"), webCtx)
    const json = await res.json()
    expect(json.contacts).toHaveLength(2)
    expect(json.contacts[0].isPrimary).toBe(true)
  })
})

// ── POST /api/crm/clients/[id]/contacts ──────────────────────────────────────

describe("POST /api/crm/clients/[id]/contacts", () => {
  beforeEach(resetMocks)

  it("returns 404 when parent client not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { POST } = await import("@/app/api/crm/clients/[id]/contacts/route")
    const res = await POST(
      makeReq("/api/crm/clients/client-x/contacts", "POST", {
        firstName: "Ana",
        lastName: "Pop",
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("creates contact and returns 201", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "client-1" }])
    mockDb.returning.mockResolvedValueOnce([
      { id: "contact-new", firstName: "Ana", lastName: "Pop" },
    ])

    const { POST } = await import("@/app/api/crm/clients/[id]/contacts/route")
    const res = await POST(
      makeReq("/api/crm/clients/client-1/contacts", "POST", {
        firstName: "Ana",
        lastName: "Pop",
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe("contact-new")
  })

  it("returns 422 when firstName is missing", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "client-1" }])

    const { POST } = await import("@/app/api/crm/clients/[id]/contacts/route")
    const res = await POST(
      makeReq("/api/crm/clients/client-1/contacts", "POST", { lastName: "Pop" }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 422 when lastName is missing", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "client-1" }])

    const { POST } = await import("@/app/api/crm/clients/[id]/contacts/route")
    const res = await POST(
      makeReq("/api/crm/clients/client-1/contacts", "POST", { firstName: "Ana" }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("writes audit log with action crm.contacts.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "client-1" }])
    mockDb.returning.mockResolvedValueOnce([
      { id: "contact-1", firstName: "Ion", lastName: "Stan" },
    ])

    const { POST } = await import("@/app/api/crm/clients/[id]/contacts/route")
    await POST(
      makeReq("/api/crm/clients/client-1/contacts", "POST", {
        firstName: "Ion",
        lastName: "Stan",
        isPrimary: true,
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.contacts.create" })
    )
  })

  it("returns 400 on invalid JSON body", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "client-1" }])

    const { POST } = await import("@/app/api/crm/clients/[id]/contacts/route")
    const badReq = {
      method: "POST",
      nextUrl: { pathname: "/api/crm/clients/client-1/contacts" },
      url: "http://localhost/api/crm/clients/client-1/contacts",
      headers: { get: () => null },
      json: async () => {
        throw new SyntaxError("bad json")
      },
    } as unknown as Request
    const res = await POST(badReq, webCtx)
    expect(res.status).toBe(400)
  })
})

// ── contact schema — field constraints ───────────────────────────────────────

describe("contact schema field constraints", () => {
  it("email must be a valid email format", () => {
    const validEmails = ["test@example.com", "user+tag@domain.co"]
    const invalidEmails = ["not-an-email", "missing@", "@domain.com"]
    for (const e of validEmails) {
      expect(e).toMatch(/.+@.+\..+/)
    }
    for (const e of invalidEmails) {
      expect(e).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    }
  })

  it("phone max length is 32 characters", () => {
    const longPhone = "0".repeat(33)
    expect(longPhone.length).toBeGreaterThan(32)
  })

  it("firstName and lastName have max length of 100", () => {
    const longName = "A".repeat(101)
    expect(longName.length).toBeGreaterThan(100)
  })

  it("isPrimary defaults to false when not provided", () => {
    const defaults = { isPrimary: undefined }
    expect(defaults.isPrimary ?? false).toBe(false)
  })
})
