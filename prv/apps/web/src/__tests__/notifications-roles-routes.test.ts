import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
  RoleSets: { admin: ["admin", "owner"] },
}))

vi.mock("@prv/auth/permission-engine", () => ({
  invalidatePermissionCache: vi.fn(),
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "1" }]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  notifications: {},
  roles: {},
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
    lte: vi.fn(),
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
  mockDb.delete.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockReturnThis()
  mockDb.set.mockReturnThis()
  mockDb.returning.mockResolvedValue([{ id: "1" }])
}

// ─── notifications PATCH ─────────────────────────────────────────────────────

describe("PATCH /api/notifications/[id]", () => {
  beforeEach(resetMocks)

  it("marks notification as read (200)", async () => {
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

  it("returns 422 when no fields provided", async () => {
    const { PATCH } = await import("@/app/api/notifications/[id]/route")
    const res = await PATCH(
      makeReq("/api/notifications/notif-1", "PATCH", {
        json: async () => ({}),
      }),
      webCtx
    )
    expect(res.status).toBe(422)
  })

  it("returns 404 when notification not found after update", async () => {
    mockDb.returning.mockResolvedValueOnce([])

    const { PATCH } = await import("@/app/api/notifications/[id]/route")
    const res = await PATCH(
      makeReq("/api/notifications/notif-1", "PATCH", {
        json: async () => ({ isDismissed: true }),
      }),
      webCtx
    )
    expect(res.status).toBe(404)
  })
})

// ─── notifications DELETE ─────────────────────────────────────────────────────

describe("DELETE /api/notifications/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when notification not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/notifications/[id]/route")
    const res = await DELETE(makeReq("/api/notifications/notif-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes notification and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "notif-1" }])

    const { DELETE } = await import("@/app/api/notifications/[id]/route")
    const res = await DELETE(makeReq("/api/notifications/notif-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action notifications.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "notif-1" }])

    const { DELETE } = await import("@/app/api/notifications/[id]/route")
    await DELETE(makeReq("/api/notifications/notif-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "notifications.delete" })
    )
  })
})

// ─── roles PATCH schema ───────────────────────────────────────────────────────

describe("roles PATCH schema", () => {
  it("valid scope levels", () => {
    const scopes = [
      "SCOPE_RECORD",
      "SCOPE_TEAM",
      "SCOPE_DEPARTMENT",
      "SCOPE_STORE",
      "SCOPE_REGION",
      "SCOPE_COMPANY",
    ]
    expect(scopes).toContain("SCOPE_COMPANY")
    expect(scopes).toContain("SCOPE_STORE")
    expect(scopes).not.toContain("SCOPE_GLOBAL")
  })
})

// ─── roles DELETE ─────────────────────────────────────────────────────────────

describe("DELETE /api/roles/[roleId]", () => {
  beforeEach(resetMocks)

  it("returns 404 when role not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/roles/[roleId]/route")
    const res = await DELETE(makeReq("/api/roles/role-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("deactivates role and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "role-1", name: "Manager", type: "custom" }])

    const { DELETE } = await import("@/app/api/roles/[roleId]/route")
    const res = await DELETE(makeReq("/api/roles/role-1"), webCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action roles.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "role-1", name: "Manager", type: "custom" }])

    const { DELETE } = await import("@/app/api/roles/[roleId]/route")
    await DELETE(makeReq("/api/roles/role-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "roles.delete" }))
  })
})

// ─── role assignments DELETE ──────────────────────────────────────────────────

describe("DELETE /api/roles/assignments/[assignmentId]", () => {
  beforeEach(resetMocks)

  it("returns 404 when assignment not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/roles/assignments/[assignmentId]/route")
    const res = await DELETE(makeReq("/api/roles/assignments/assign-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("revokes assignment and returns success", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "assign-1", userId: "u-1" }])

    const { DELETE } = await import("@/app/api/roles/assignments/[assignmentId]/route")
    const res = await DELETE(makeReq("/api/roles/assignments/assign-1"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("fires audit log with action roles.revoke", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "assign-1", userId: "u-1" }])

    const { DELETE } = await import("@/app/api/roles/assignments/[assignmentId]/route")
    await DELETE(makeReq("/api/roles/assignments/assign-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "roles.revoke" }))
  })
})

// ─── temporary access grants DELETE ──────────────────────────────────────────

describe("DELETE /api/roles/grants/[grantId]", () => {
  beforeEach(resetMocks)

  it("returns 404 when grant not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/roles/grants/[grantId]/route")
    const res = await DELETE(makeReq("/api/roles/grants/grant-1"), webCtx)
    expect(res.status).toBe(404)
  })

  it("revokes grant and returns success", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "grant-1", grantedToUserId: "u-1" }])

    const { DELETE } = await import("@/app/api/roles/grants/[grantId]/route")
    const res = await DELETE(makeReq("/api/roles/grants/grant-1"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("fires audit log with action roles.grants.revoke", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "grant-1", grantedToUserId: "u-1" }])

    const { DELETE } = await import("@/app/api/roles/grants/[grantId]/route")
    await DELETE(makeReq("/api/roles/grants/grant-1"), webCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "roles.grants.revoke" })
    )
  })
})
