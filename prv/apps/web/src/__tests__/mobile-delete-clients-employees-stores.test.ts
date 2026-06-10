import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/mobile/auth", () => ({
  withMobileAuth: (handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: "1" }]),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  clients: {},
  users: {},
  stores: {},
  departments: {},
  teams: {},
  projects: {},
  projectMembers: {},
  projectMilestones: {},
  notifications: {},
  orders: {},
  products: {},
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    sql: vi.fn(),
    count: vi.fn(),
    gte: vi.fn(),
    desc: vi.fn(),
    notInArray: vi.fn(),
  }
})

function makeReq(
  path: string,
  method = "DELETE",
  overrides: Record<string, unknown> = {}
): NextRequest {
  return {
    method,
    nextUrl: { pathname: path },
    headers: { get: () => null },
    json: async () => ({}),
    ...overrides,
  } as unknown as NextRequest
}

const mobileCtx = {
  companyId: "company-1",
  userId: "user-self",
  sessionId: "session-1",
}

function resetMocks() {
  vi.resetAllMocks()
  mockDb.select.mockReturnThis()
  mockDb.update.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockReturnThis()
  mockDb.set.mockReturnThis()
  mockDb.innerJoin.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
}

// ─── Mobile clients DELETE ────────────────────────────────────────────────────

describe("DELETE /api/mobile/clients/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when client not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/mobile/clients/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/clients/client-1"), mobileCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes the client and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "client-1", name: "Acme" }])

    const { DELETE } = await import("@/app/api/mobile/clients/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/clients/client-1"), mobileCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action crm.clients.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "client-1", name: "Acme" }])

    const { DELETE } = await import("@/app/api/mobile/clients/[id]/route")
    await DELETE(makeReq("/api/mobile/clients/client-1"), mobileCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.clients.delete" })
    )
  })

  it("returns 400 when ID is missing from path", async () => {
    const { DELETE } = await import("@/app/api/mobile/clients/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/clients/"), mobileCtx)
    expect(res.status).toBe(400)
  })
})

// ─── Mobile employees DELETE ──────────────────────────────────────────────────

describe("DELETE /api/mobile/employees/[id]", () => {
  beforeEach(resetMocks)

  it("prevents deleting own account (409)", async () => {
    const { DELETE } = await import("@/app/api/mobile/employees/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/employees/user-self"), mobileCtx)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe("INVALID_OPERATION")
  })

  it("returns 404 when employee not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/mobile/employees/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/employees/emp-other"), mobileCtx)
    expect(res.status).toBe(404)
  })

  it("soft-deletes employee and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "emp-other", firstName: "Jane", lastName: "Doe" }])

    const { DELETE } = await import("@/app/api/mobile/employees/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/employees/emp-other"), mobileCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action people.delete", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "emp-other", firstName: "Jane", lastName: "Doe" }])

    const { DELETE } = await import("@/app/api/mobile/employees/[id]/route")
    await DELETE(makeReq("/api/mobile/employees/emp-other"), mobileCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "people.delete" }))
  })
})

// ─── Mobile stores DELETE ─────────────────────────────────────────────────────

describe("DELETE /api/mobile/stores/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when store not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { DELETE } = await import("@/app/api/mobile/stores/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/stores/store-1"), mobileCtx)
    expect(res.status).toBe(404)
  })

  it("deactivates store (sets isActive false) and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "store-1", name: "Store Alpha", isActive: true }])

    const { DELETE } = await import("@/app/api/mobile/stores/[id]/route")
    const res = await DELETE(makeReq("/api/mobile/stores/store-1"), mobileCtx)
    expect(res.status).toBe(204)
  })

  it("fires audit log with action operations.stores.deactivate", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "store-1", name: "Store Alpha", isActive: true }])

    const { DELETE } = await import("@/app/api/mobile/stores/[id]/route")
    await DELETE(makeReq("/api/mobile/stores/store-1"), mobileCtx)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "operations.stores.deactivate" })
    )
  })
})

// ─── Mobile tasks PATCH (toggle complete) ────────────────────────────────────

describe("PATCH /api/mobile/tasks/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when task not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])

    const { PATCH } = await import("@/app/api/mobile/tasks/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/tasks/task-1", "PATCH", {
        json: async () => ({ isComplete: true }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(404)
  })

  it("marks task complete and returns updated record", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "task-1", isComplete: false, projectId: "proj-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "task-1", isComplete: true }])

    const { PATCH } = await import("@/app/api/mobile/tasks/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/tasks/task-1", "PATCH", {
        json: async () => ({ isComplete: true }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.isComplete).toBe(true)
  })

  it("fires audit log with action mobile.task.complete when completing", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "task-1", isComplete: false, projectId: "proj-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "task-1", isComplete: true }])

    const { PATCH } = await import("@/app/api/mobile/tasks/[id]/route")
    await PATCH(
      makeReq("/api/mobile/tasks/task-1", "PATCH", {
        json: async () => ({ isComplete: true }),
      }),
      mobileCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "mobile.task.complete" })
    )
  })

  it("fires audit log with action mobile.task.reopen when reopening", async () => {
    const { writeAuditLog } = await import("@prv/auth")
    mockDb.limit.mockResolvedValueOnce([{ id: "task-1", isComplete: true, projectId: "proj-1" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "task-1", isComplete: false }])

    const { PATCH } = await import("@/app/api/mobile/tasks/[id]/route")
    await PATCH(
      makeReq("/api/mobile/tasks/task-1", "PATCH", {
        json: async () => ({ isComplete: false }),
      }),
      mobileCtx
    )
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "mobile.task.reopen" })
    )
  })

  it("returns 422 for invalid payload (missing isComplete)", async () => {
    const { PATCH } = await import("@/app/api/mobile/tasks/[id]/route")
    const res = await PATCH(
      makeReq("/api/mobile/tasks/task-1", "PATCH", {
        json: async () => ({ bogus: true }),
      }),
      mobileCtx
    )
    expect(res.status).toBe(422)
  })
})
