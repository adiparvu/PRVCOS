import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

const mockHasScope = vi.fn().mockReturnValue(true)

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
  RoleSets: { admin: [], management: [] },
  hasScope: mockHasScope,
}))

vi.mock("@prv/search", () => ({
  upsertDocument: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@prv/cache", () => ({
  cacheMemo: vi.fn().mockResolvedValue([]),
  cacheDel: vi.fn().mockResolvedValue(undefined),
  CacheTTL: { COMPANY_CONTEXT: 300 },
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
  returning: vi.fn().mockResolvedValue([{ id: "new-1", name: "Test" }]),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  companies: {},
  companyMemberships: {},
  companySettings: {},
  clients: {},
  invoices: {},
  invoiceItems: {},
  projects: {},
  users: {},
  clientContacts: {},
  auditLogs: {},
  roles: {},
  permissions: {},
  userRoleAssignments: {},
  temporaryAccessGrants: {},
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    isNotNull: vi.fn(),
    desc: vi.fn(),
    asc: vi.fn(),
    sql: vi.fn(),
    count: vi.fn(),
    sum: vi.fn(),
    inArray: vi.fn(),
    notInArray: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    lt: vi.fn(),
    not: vi.fn(),
    or: vi.fn(),
    like: vi.fn(),
  }
})

const webCtx = {
  session: {
    companyId: "company-1",
    userId: "user-1",
    sessionId: "session-1",
    scopeLevel: 9,
  },
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
  mockHasScope.mockReturnValue(true)
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
  mockDb.returning.mockResolvedValue([{ id: "new-1", name: "Test" }])
}

// ─── POST /api/companies ──────────────────────────────────────────────────────

describe("POST /api/companies", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/companies/route")
    const res = await POST(makeReq("/api/companies"), webCtx)
    expect(res.status).toBe(422)
  })

  it("returns 409 when slug is already taken", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "existing-co" }])
    const { POST } = await import("@/app/api/companies/route")
    const res = await POST(
      makeReq("/api/companies", "POST", {
        json: async () => ({ name: "ACME Corp", slug: "acme-corp" }),
      }),
      webCtx
    )
    expect(res.status).toBe(409)
  })

  it("creates company and returns 201 with id", async () => {
    // limit returns [] → no slug conflict
    mockDb.returning.mockResolvedValueOnce([{ id: "co-new", slug: "new-co", name: "New Co" }])
    const { POST } = await import("@/app/api/companies/route")
    const res = await POST(
      makeReq("/api/companies", "POST", {
        json: async () => ({ name: "New Co", slug: "new-co" }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("co-new")
  })

  it("fires audit log with action companies.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "co-new", slug: "new-co", name: "New Co" }])
    const { POST } = await import("@/app/api/companies/route")
    await POST(
      makeReq("/api/companies", "POST", {
        json: async () => ({ name: "New Co", slug: "new-co" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "companies.create" })
    )
  })
})

// ─── PATCH /api/companies/[id] ────────────────────────────────────────────────

describe("PATCH /api/companies/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when company not found", async () => {
    // limit returns [] by default → existing = undefined → 404
    const { PATCH } = await import("@/app/api/companies/[id]/route")
    const res = await PATCH(
      makeReq("/api/companies/co-1", "PATCH", {
        json: async () => ({ name: "Updated" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates company and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "co-1", slug: "co-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "co-1", name: "Updated", slug: "co-1" }])
    const { PATCH } = await import("@/app/api/companies/[id]/route")
    const res = await PATCH(
      makeReq("/api/companies/co-1", "PATCH", {
        json: async () => ({ name: "Updated" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe("Updated")
  })

  it("fires audit log with action companies.update", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "co-1", slug: "co-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "co-1", name: "Updated", slug: "co-1" }])
    const { PATCH } = await import("@/app/api/companies/[id]/route")
    await PATCH(
      makeReq("/api/companies/co-1", "PATCH", {
        json: async () => ({ name: "Updated" }),
      }),
      webCtx
    )
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
    const res = await DELETE(makeReq("/api/companies/co-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes company and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "co-1", name: "ACME" }])
    const { DELETE } = await import("@/app/api/companies/[id]/route")
    const res = await DELETE(makeReq("/api/companies/co-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action companies.suspend", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "co-1", name: "ACME" }])
    const { DELETE } = await import("@/app/api/companies/[id]/route")
    await DELETE(makeReq("/api/companies/co-1", "DELETE"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "companies.suspend" })
    )
  })
})

// ─── PUT /api/companies/[id]/settings ────────────────────────────────────────

describe("PUT /api/companies/[id]/settings", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { PUT } = await import("@/app/api/companies/[id]/settings/route")
    const res = await PUT(
      makeReq("/api/companies/company-1/settings", "PUT", {
        nextUrl: { pathname: "/api/companies/company-1/settings" },
        json: async () => ({}),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("upserts setting and returns 200 with id and key", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "setting-1", key: "theme" }])
    const { PUT } = await import("@/app/api/companies/[id]/settings/route")
    const res = await PUT(
      makeReq("/api/companies/company-1/settings", "PUT", {
        nextUrl: { pathname: "/api/companies/company-1/settings" },
        json: async () => ({ module: "ui", key: "theme", value: "dark" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.key).toBe("theme")
  })

  it("fires audit log with action companies.settings.write", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "setting-1", key: "theme" }])
    const { PUT } = await import("@/app/api/companies/[id]/settings/route")
    await PUT(
      makeReq("/api/companies/company-1/settings", "PUT", {
        nextUrl: { pathname: "/api/companies/company-1/settings" },
        json: async () => ({ module: "ui", key: "theme", value: "dark" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "companies.settings.write" })
    )
  })
})

// ─── POST /api/companies/[id]/members ────────────────────────────────────────

describe("POST /api/companies/[id]/members", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/companies/[id]/members/route")
    const res = await POST(
      makeReq("/api/companies/company-1/members", "POST", {
        nextUrl: { pathname: "/api/companies/company-1/members" },
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 409 when membership already exists", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "mem-existing" }])
    const { POST } = await import("@/app/api/companies/[id]/members/route")
    const res = await POST(
      makeReq("/api/companies/company-1/members", "POST", {
        nextUrl: { pathname: "/api/companies/company-1/members" },
        json: async () => ({
          userId: "00000000-0000-0000-0000-000000000099",
          primaryRole: "manager",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(409)
  })

  it("creates membership and returns 201", async () => {
    // limit returns [] → no duplicate
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "mem-new",
        userId: "00000000-0000-0000-0000-000000000099",
        primaryRole: "manager",
        status: "INVITED",
      },
    ])
    const { POST } = await import("@/app/api/companies/[id]/members/route")
    const res = await POST(
      makeReq("/api/companies/company-1/members", "POST", {
        nextUrl: { pathname: "/api/companies/company-1/members" },
        json: async () => ({
          userId: "00000000-0000-0000-0000-000000000099",
          primaryRole: "manager",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.status).toBe("INVITED")
  })

  it("fires audit log with action companies.members.add", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([
      { id: "mem-new", userId: "uid", primaryRole: "staff", status: "INVITED" },
    ])
    const { POST } = await import("@/app/api/companies/[id]/members/route")
    await POST(
      makeReq("/api/companies/company-1/members", "POST", {
        nextUrl: { pathname: "/api/companies/company-1/members" },
        json: async () => ({
          userId: "00000000-0000-0000-0000-000000000099",
          primaryRole: "staff",
        }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "companies.members.add" })
    )
  })
})

// ─── DELETE /api/companies/[id]/members/[userId] ──────────────────────────────

describe("DELETE /api/companies/[id]/members/[userId]", () => {
  beforeEach(resetMocks)

  it("returns 422 when trying to remove self", async () => {
    const { DELETE } = await import("@/app/api/companies/[id]/members/[userId]/route")
    const res = await DELETE(
      makeReq("/api/companies/company-1/members/user-1", "DELETE", {
        nextUrl: { pathname: "/api/companies/company-1/members/user-1" },
        json: async () => ({}),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when membership not found", async () => {
    mockDb.returning.mockResolvedValueOnce([])
    const { DELETE } = await import("@/app/api/companies/[id]/members/[userId]/route")
    const res = await DELETE(
      makeReq("/api/companies/company-1/members/other-user", "DELETE", {
        nextUrl: { pathname: "/api/companies/company-1/members/other-user" },
        json: async () => ({}),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("deactivates membership and returns 200", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "mem-1", status: "INACTIVE" }])
    const { DELETE } = await import("@/app/api/companies/[id]/members/[userId]/route")
    const res = await DELETE(
      makeReq("/api/companies/company-1/members/other-user", "DELETE", {
        nextUrl: { pathname: "/api/companies/company-1/members/other-user" },
        json: async () => ({}),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("INACTIVE")
  })

  it("fires audit log with action companies.members.remove", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "mem-1", status: "INACTIVE" }])
    const { DELETE } = await import("@/app/api/companies/[id]/members/[userId]/route")
    await DELETE(
      makeReq("/api/companies/company-1/members/other-user", "DELETE", {
        nextUrl: { pathname: "/api/companies/company-1/members/other-user" },
        json: async () => ({}),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "companies.members.remove" })
    )
  })
})

// ─── POST /api/crm/clients ────────────────────────────────────────────────────

describe("POST /api/crm/clients", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required name", async () => {
    const { POST } = await import("@/app/api/crm/clients/route")
    const res = await POST(makeReq("/api/crm/clients"), webCtx)
    expect(res.status).toBe(422)
  })

  it("creates client and returns 201 with id and name", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "cli-new", name: "Jane Corp" }])
    const { POST } = await import("@/app/api/crm/clients/route")
    const res = await POST(
      makeReq("/api/crm/clients", "POST", {
        json: async () => ({ name: "Jane Corp" }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("cli-new")
    expect(body.name).toBe("Jane Corp")
  })

  it("fires audit log with action crm.clients.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([{ id: "cli-new", name: "Jane Corp" }])
    const { POST } = await import("@/app/api/crm/clients/route")
    await POST(
      makeReq("/api/crm/clients", "POST", {
        json: async () => ({ name: "Jane Corp" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.clients.create" })
    )
  })
})

// ─── PATCH /api/crm/clients/[id] ─────────────────────────────────────────────

describe("PATCH /api/crm/clients/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when client not found", async () => {
    // limit returns [] → not found
    const { PATCH } = await import("@/app/api/crm/clients/[id]/route")
    const res = await PATCH(
      makeReq("/api/crm/clients/cli-1", "PATCH", {
        json: async () => ({ name: "Updated" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates client and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "cli-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "cli-1" }])
    const { PATCH } = await import("@/app/api/crm/clients/[id]/route")
    const res = await PATCH(
      makeReq("/api/crm/clients/cli-1", "PATCH", {
        json: async () => ({ name: "Updated" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
  })

  it("fires audit log with action crm.clients.update", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "cli-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "cli-1" }])
    const { PATCH } = await import("@/app/api/crm/clients/[id]/route")
    await PATCH(
      makeReq("/api/crm/clients/cli-1", "PATCH", {
        json: async () => ({ name: "Updated" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.clients.update" })
    )
  })
})

// ─── DELETE /api/crm/clients/[id] ────────────────────────────────────────────

describe("DELETE /api/crm/clients/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when client not found", async () => {
    const { DELETE } = await import("@/app/api/crm/clients/[id]/route")
    const res = await DELETE(makeReq("/api/crm/clients/cli-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes client and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "cli-1", name: "Jane Corp" }])
    const { DELETE } = await import("@/app/api/crm/clients/[id]/route")
    const res = await DELETE(makeReq("/api/crm/clients/cli-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action crm.clients.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "cli-1", name: "Jane Corp" }])
    const { DELETE } = await import("@/app/api/crm/clients/[id]/route")
    await DELETE(makeReq("/api/crm/clients/cli-1", "DELETE"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.clients.delete" })
    )
  })
})

// ─── POST /api/crm/leads ──────────────────────────────────────────────────────

describe("POST /api/crm/leads", () => {
  beforeEach(resetMocks)

  it("returns 400 for missing required fields", async () => {
    const { POST } = await import("@/app/api/crm/leads/route")
    const res = await POST(makeReq("/api/crm/leads"), webCtx)
    expect(res.status).toBe(400)
  })

  it("creates lead and returns 201 with success and lead", async () => {
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "lead-new",
        name: "John Doe",
        email: "john@example.com",
        phone: "+40700000001",
        createdAt: new Date(),
        metadata: {},
      },
    ])
    const { POST } = await import("@/app/api/crm/leads/route")
    const res = await POST(
      makeReq("/api/crm/leads", "POST", {
        json: async () => ({
          name: "John Doe",
          email: "john@example.com",
          phone: "+40700000001",
          source: "website",
        }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.lead.id).toBe("lead-new")
  })

  it("fires audit log with action crm.lead.created", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "lead-new",
        name: "John",
        email: "j@e.com",
        phone: "+40700000001",
        createdAt: new Date(),
        metadata: {},
      },
    ])
    const { POST } = await import("@/app/api/crm/leads/route")
    await POST(
      makeReq("/api/crm/leads", "POST", {
        json: async () => ({
          name: "John Doe",
          email: "john@example.com",
          phone: "+40700000001",
          source: "referral",
        }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.lead.created" })
    )
  })
})

// ─── PATCH /api/crm/leads/[id] ───────────────────────────────────────────────

describe("PATCH /api/crm/leads/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when lead not found", async () => {
    // limit returns [] → not found
    const { PATCH } = await import("@/app/api/crm/leads/[id]/route")
    const res = await PATCH(
      makeReq("/api/crm/leads/lead-1", "PATCH", {
        json: async () => ({ stage: "contacted" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates lead stage and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ metadata: { stage: "new", score: 0 }, name: "J" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "lead-1", name: "J" }])
    const { PATCH } = await import("@/app/api/crm/leads/[id]/route")
    const res = await PATCH(
      makeReq("/api/crm/leads/lead-1", "PATCH", {
        json: async () => ({ stage: "contacted" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
  })

  it("fires audit log with action crm.leads.update", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ metadata: {}, name: "J" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "lead-1", name: "J" }])
    const { PATCH } = await import("@/app/api/crm/leads/[id]/route")
    await PATCH(
      makeReq("/api/crm/leads/lead-1", "PATCH", {
        json: async () => ({ stage: "qualified" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.leads.update" })
    )
  })
})

// ─── DELETE /api/crm/leads/[id] ──────────────────────────────────────────────

describe("DELETE /api/crm/leads/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when lead not found", async () => {
    const { DELETE } = await import("@/app/api/crm/leads/[id]/route")
    const res = await DELETE(makeReq("/api/crm/leads/lead-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes lead and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "lead-1", name: "J" }])
    const { DELETE } = await import("@/app/api/crm/leads/[id]/route")
    const res = await DELETE(makeReq("/api/crm/leads/lead-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action crm.leads.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "lead-1", name: "J" }])
    const { DELETE } = await import("@/app/api/crm/leads/[id]/route")
    await DELETE(makeReq("/api/crm/leads/lead-1", "DELETE"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.leads.delete" })
    )
  })
})

// ─── POST /api/crm/quotes ─────────────────────────────────────────────────────

describe("POST /api/crm/quotes", () => {
  beforeEach(resetMocks)

  it("creates quote and returns 201 with quote object", async () => {
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "q-new",
        invoiceNumber: "Q-123",
        status: "draft",
        issueDate: "2025-01-01",
        dueDate: "2025-02-01",
        total: "0",
        clientId: null,
      },
    ])
    const { POST } = await import("@/app/api/crm/quotes/route")
    const res = await POST(
      makeReq("/api/crm/quotes", "POST", {
        json: async () => ({ items: [], validityDays: 30 }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.quote.id).toBe("q-new")
  })

  it("fires audit log with action crm.quotes.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "q-new",
        invoiceNumber: "Q-123",
        status: "draft",
        issueDate: "2025-01-01",
        dueDate: "2025-02-01",
        total: "100",
        clientId: "cli-1",
      },
    ])
    const { POST } = await import("@/app/api/crm/quotes/route")
    await POST(
      makeReq("/api/crm/quotes", "POST", {
        json: async () => ({ clientId: "cli-1", items: [] }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.quotes.create" })
    )
  })
})

// ─── PATCH /api/crm/quotes/[id] ──────────────────────────────────────────────

describe("PATCH /api/crm/quotes/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when quote not found", async () => {
    const { PATCH } = await import("@/app/api/crm/quotes/[id]/route")
    const res = await PATCH(
      makeReq("/api/crm/quotes/q-1", "PATCH", {
        json: async () => ({ status: "sent" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates quote and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "q-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "q-1" }])
    const { PATCH } = await import("@/app/api/crm/quotes/[id]/route")
    const res = await PATCH(
      makeReq("/api/crm/quotes/q-1", "PATCH", {
        json: async () => ({ status: "sent" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
  })

  it("fires audit log with action crm.quotes.update", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "q-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "q-1" }])
    const { PATCH } = await import("@/app/api/crm/quotes/[id]/route")
    await PATCH(
      makeReq("/api/crm/quotes/q-1", "PATCH", {
        json: async () => ({ status: "sent" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.quotes.update" })
    )
  })
})

// ─── DELETE /api/crm/quotes/[id] ─────────────────────────────────────────────

describe("DELETE /api/crm/quotes/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when quote not found", async () => {
    const { DELETE } = await import("@/app/api/crm/quotes/[id]/route")
    const res = await DELETE(makeReq("/api/crm/quotes/q-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes quote and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "q-1" }])
    const { DELETE } = await import("@/app/api/crm/quotes/[id]/route")
    const res = await DELETE(makeReq("/api/crm/quotes/q-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action crm.quotes.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "q-1" }])
    const { DELETE } = await import("@/app/api/crm/quotes/[id]/route")
    await DELETE(makeReq("/api/crm/quotes/q-1", "DELETE"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.quotes.delete" })
    )
  })
})

// ─── POST /api/roles ──────────────────────────────────────────────────────────

describe("POST /api/roles", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing required fields", async () => {
    const { POST } = await import("@/app/api/roles/route")
    const res = await POST(makeReq("/api/roles"), webCtx)
    expect(res.status).toBe(422)
  })

  it("returns 409 when slug already exists", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "role-existing" }])
    const { POST } = await import("@/app/api/roles/route")
    const res = await POST(
      makeReq("/api/roles", "POST", {
        json: async () => ({ name: "Manager", slug: "manager" }),
      }),
      webCtx
    )
    expect(res.status).toBe(409)
  })

  it("creates role and returns 201 with slug", async () => {
    // limit returns [] → no slug conflict
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "role-new",
        name: "Manager",
        slug: "manager",
        type: "custom",
        defaultScopeLevel: "SCOPE_RECORD",
      },
    ])
    const { POST } = await import("@/app/api/roles/route")
    const res = await POST(
      makeReq("/api/roles", "POST", {
        json: async () => ({ name: "Manager", slug: "manager" }),
      }),
      webCtx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.slug).toBe("manager")
  })

  it("fires audit log with action roles.create", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "role-new",
        name: "Staff",
        slug: "staff",
        type: "custom",
        defaultScopeLevel: "SCOPE_RECORD",
      },
    ])
    const { POST } = await import("@/app/api/roles/route")
    await POST(
      makeReq("/api/roles", "POST", {
        json: async () => ({ name: "Staff", slug: "staff" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "roles.create" }))
  })
})

// ─── PATCH /api/roles/[roleId] ────────────────────────────────────────────────

describe("PATCH /api/roles/[roleId]", () => {
  beforeEach(resetMocks)

  it("returns 404 when role not found", async () => {
    // limit returns [] by default → role = undefined → 404
    const { PATCH } = await import("@/app/api/roles/[roleId]/route")
    const res = await PATCH(
      makeReq("/api/roles/role-1", "PATCH", {
        json: async () => ({ name: "Updated" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates role and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "role-1", type: "custom" }])
    mockDb.returning.mockResolvedValueOnce([
      { id: "role-1", name: "Updated", slug: "manager", description: null },
    ])
    const { PATCH } = await import("@/app/api/roles/[roleId]/route")
    const res = await PATCH(
      makeReq("/api/roles/role-1", "PATCH", {
        json: async () => ({ name: "Updated" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.name).toBe("Updated")
  })

  it("fires audit log with action roles.update", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "role-1", type: "custom" }])
    mockDb.returning.mockResolvedValueOnce([
      { id: "role-1", name: "Updated", slug: "manager", description: null },
    ])
    const { PATCH } = await import("@/app/api/roles/[roleId]/route")
    await PATCH(
      makeReq("/api/roles/role-1", "PATCH", {
        json: async () => ({ name: "Updated" }),
      }),
      webCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "roles.update" }))
  })
})

// ─── DELETE /api/roles/[roleId] ───────────────────────────────────────────────

describe("DELETE /api/roles/[roleId]", () => {
  beforeEach(resetMocks)

  it("returns 404 when role not found", async () => {
    const { DELETE } = await import("@/app/api/roles/[roleId]/route")
    const res = await DELETE(makeReq("/api/roles/role-1", "DELETE"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes role and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "role-1", name: "Manager", type: "custom" }])
    const { DELETE } = await import("@/app/api/roles/[roleId]/route")
    const res = await DELETE(makeReq("/api/roles/role-1", "DELETE"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action roles.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "role-1", name: "Manager", type: "custom" }])
    const { DELETE } = await import("@/app/api/roles/[roleId]/route")
    await DELETE(makeReq("/api/roles/role-1", "DELETE"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "roles.delete" }))
  })
})
