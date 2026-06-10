import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  RoleSets: { admin: [], management: [] },
  PERMISSION_CATALOG: {
    "crm.read": { module: "crm", action: "read" },
    "hr.write": { module: "hr", action: "write" },
  },
}))

const mockMarkAllRead = vi.fn().mockResolvedValue(undefined)
const mockDismissAll = vi.fn().mockResolvedValue(undefined)
const mockExecuteAction = vi.fn().mockResolvedValue({ ok: true })
const mockDeleteConversation = vi.fn().mockResolvedValue(true)
const mockIsTypesenseAvailable = vi.fn().mockReturnValue(true)
const mockBulkUpsert = vi.fn().mockResolvedValue(undefined)
const mockInngestSend = vi.fn().mockResolvedValue({ ids: ["job-1"] })

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
  onConflictDoNothing: vi.fn().mockReturnThis(),
  // Makes bare `await db.select().from().where()` chains resolve to []
  then: (resolve: (val: unknown[]) => void) => resolve([]),
}

vi.mock("@prv/db", () => ({
  db: mockDb,
  markAllNotificationsRead: mockMarkAllRead,
  dismissAllNotifications: mockDismissAll,
  executeNotificationAction: mockExecuteAction,
}))

vi.mock("@prv/ai-engine", () => ({
  deleteConversation: mockDeleteConversation,
  getConversationHistory: vi.fn().mockResolvedValue([]),
}))

vi.mock("@prv/search", () => ({
  isTypesenseAvailable: mockIsTypesenseAvailable,
  bulkUpsert: mockBulkUpsert,
  upsertDocument: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@prv/jobs/client", () => ({
  inngest: { send: mockInngestSend },
}))

vi.mock("@prv/db/schema", () => ({
  userPresence: { userId: {}, companyId: {} },
  roles: {},
  permissions: { key: {}, id: {} },
  rolePermissions: { roleId: {}, permissionId: {} },
  users: { id: {}, firstName: {}, lastName: {}, email: {}, role: {}, companyId: {} },
  projects: { id: {}, name: {}, status: {}, companyId: {} },
  clients: { id: {}, name: {}, city: {}, status: {}, type: {}, companyId: {} },
  invoices: { id: {}, invoiceNumber: {}, status: {}, total: {}, companyId: {} },
  documents: { id: {}, title: {}, fileName: {}, mimeType: {}, companyId: {} },
  vehicles: { id: {}, licensePlate: {}, make: {}, model: {}, status: {}, companyId: {} },
  tools: { id: {}, name: {}, brand: {}, model: {}, status: {}, companyId: {} },
  products: { id: {}, name: {}, status: {}, companyId: {} },
  teams: { id: {}, name: {}, companyId: {} },
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
  mockMarkAllRead.mockResolvedValue(undefined)
  mockDismissAll.mockResolvedValue(undefined)
  mockExecuteAction.mockResolvedValue({ ok: true })
  mockDeleteConversation.mockResolvedValue(true)
  mockIsTypesenseAvailable.mockReturnValue(true)
  mockBulkUpsert.mockResolvedValue(undefined)
  mockInngestSend.mockResolvedValue({ ids: ["job-1"] })
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
  mockDb.onConflictDoNothing.mockReturnThis()
  mockDb.returning.mockResolvedValue([{ id: "new-1" }])
}

// ─── POST /api/notifications/bulk ────────────────────────────────────────────

describe("POST /api/notifications/bulk", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid operation", async () => {
    const { POST } = await import("@/app/api/notifications/bulk/route")
    const res = await POST(
      makeReq("/api/notifications/bulk", "POST", {
        json: async () => ({ operation: "invalid_op" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("calls markAllNotificationsRead and returns 200", async () => {
    const { POST } = await import("@/app/api/notifications/bulk/route")
    const res = await POST(
      makeReq("/api/notifications/bulk", "POST", {
        json: async () => ({ operation: "mark_all_read", filter: "unread" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(mockMarkAllRead).toHaveBeenCalledWith("user-1", "company-1", "unread")
  })

  it("calls dismissAllNotifications and returns 200", async () => {
    const { POST } = await import("@/app/api/notifications/bulk/route")
    const res = await POST(
      makeReq("/api/notifications/bulk", "POST", {
        json: async () => ({ operation: "dismiss_all" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    expect(mockDismissAll).toHaveBeenCalledWith("user-1", "company-1", "all")
  })
})

// ─── POST /api/notifications/[id]/action ─────────────────────────────────────

describe("POST /api/notifications/[id]/action", () => {
  beforeEach(resetMocks)

  it("returns 400 for invalid action value", async () => {
    const { POST } = await import("@/app/api/notifications/[id]/action/route")
    const res = await POST(
      makeReq("/api/notifications/notif-1/action", "POST", {
        json: async () => ({ action: "ignore" }),
      }),
      webCtx
    )
    expect(res.status).toBe(400)
  })

  it("returns 422 when executeNotificationAction fails", async () => {
    mockExecuteAction.mockResolvedValueOnce({ ok: false, error: "Already actioned" })
    const { POST } = await import("@/app/api/notifications/[id]/action/route")
    const res = await POST(
      makeReq("/api/notifications/notif-1/action", "POST", {
        json: async () => ({ action: "approve" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("executes action and returns 200 with audit log", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    const { POST } = await import("@/app/api/notifications/[id]/action/route")
    const res = await POST(
      makeReq("/api/notifications/notif-1/action", "POST", {
        json: async () => ({ action: "approve" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "notification.action.approve" })
    )
  })
})

// ─── POST /api/presence/override ─────────────────────────────────────────────

describe("POST /api/presence/override", () => {
  beforeEach(resetMocks)

  it("returns 422 for invalid status value", async () => {
    const { POST } = await import("@/app/api/presence/override/route")
    const res = await POST(
      makeReq("/api/presence/override", "POST", {
        json: async () => ({ status: "invisible" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("upserts presence and returns 200 with status", async () => {
    const { POST } = await import("@/app/api/presence/override/route")
    const res = await POST(
      makeReq("/api/presence/override", "POST", {
        json: async () => ({ status: "busy" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.status).toBe("busy")
  })
})

// ─── DELETE /api/presence/override ───────────────────────────────────────────

describe("DELETE /api/presence/override", () => {
  beforeEach(resetMocks)

  it("clears override and returns 200 with status online", async () => {
    const { DELETE } = await import("@/app/api/presence/override/route")
    const res = await DELETE(makeReq("/api/presence/override", "DELETE"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.status).toBe("online")
  })
})

// ─── DELETE /api/intelligence/conversations/[id] ─────────────────────────────

describe("DELETE /api/intelligence/conversations/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when conversation not found", async () => {
    mockDeleteConversation.mockResolvedValueOnce(null)
    const { DELETE } = await import("@/app/api/intelligence/conversations/[id]/route")
    const res = await DELETE(makeReq("/api/intelligence/conversations/conv-1", "DELETE"), webCtx, {
      params: { id: "conv-1" },
    })
    expect(res.status).toBe(404)
  })

  it("deletes conversation and returns 204", async () => {
    const { DELETE } = await import("@/app/api/intelligence/conversations/[id]/route")
    const res = await DELETE(makeReq("/api/intelligence/conversations/conv-1", "DELETE"), webCtx, {
      params: { id: "conv-1" },
    })
    expect(res.status).toBe(204)
  })
})

// ─── POST /api/search/reindex ─────────────────────────────────────────────────

describe("POST /api/search/reindex", () => {
  beforeEach(resetMocks)

  it("returns 503 when Typesense is not configured", async () => {
    mockIsTypesenseAvailable.mockReturnValueOnce(false)
    const { POST } = await import("@/app/api/search/reindex/route")
    const res = await POST(makeReq("/api/search/reindex"), webCtx)
    expect(res.status).toBe(503)
  })

  it("returns 200 with indexed counts when reindex succeeds", async () => {
    const { POST } = await import("@/app/api/search/reindex/route")
    const res = await POST(makeReq("/api/search/reindex"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.indexed).toBeDefined()
    expect(body.indexed.users).toBe(0)
  })
})

// ─── PATCH /api/roles/[roleId]/permissions ────────────────────────────────────

describe("PATCH /api/roles/[roleId]/permissions", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing permissionKeys", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "role-1", type: "custom" }])
    const { PATCH } = await import("@/app/api/roles/[roleId]/permissions/route")
    const res = await PATCH(
      makeReq("/api/roles/role-1/permissions", "PATCH", {
        json: async () => ({ operation: "set" }),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when role not found or is a system role", async () => {
    const { PATCH } = await import("@/app/api/roles/[roleId]/permissions/route")
    const res = await PATCH(
      makeReq("/api/roles/role-1/permissions", "PATCH", {
        json: async () => ({ permissionKeys: ["crm.read"], operation: "set" }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })

  it("updates permissions and returns 200 with operation result", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "role-1", type: "custom" }])
    const { PATCH } = await import("@/app/api/roles/[roleId]/permissions/route")
    const res = await PATCH(
      makeReq("/api/roles/role-1/permissions", "PATCH", {
        json: async () => ({ permissionKeys: ["crm.read"], operation: "set" }),
      }),
      webCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.operation).toBe("set")
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "roles.permissions.update" })
    )
  })
})
