import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

vi.mock("@/lib/mobile/auth", () => ({ withMobileAuth: (h: unknown) => h }))
vi.mock("@prv/auth", () => ({ writeAuditLog: vi.fn() }))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  limit: vi.fn(() => nextResult()),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(() => nextResult()),
  then: (r: (v: unknown[]) => void) => r(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => ({
  projects: {},
  projectMilestones: {},
  renovationProjects: {},
  renovationPhases: {},
  renovationTasks: {},
  renovationSiteReports: {},
  suppliers: {},
  clients: {},
  users: {},
}))
vi.mock("drizzle-orm", async (o) => {
  const actual = await o<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    asc: vi.fn(),
    desc: vi.fn(),
    max: vi.fn(),
  }
})

const ctx = { companyId: "co-1", userId: "u-1", sessionId: "s-1" }
const UID = "11111111-1111-1111-1111-111111111111"
function req(url: string, method: string, body?: unknown): NextRequest {
  const u = new URL(`http://localhost${url}`)
  return {
    method,
    nextUrl: { pathname: u.pathname, searchParams: u.searchParams },
    url: u.toString(),
    json: async () => body ?? {},
    headers: { get: () => null },
  } as unknown as NextRequest
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of [
    "select",
    "insert",
    "update",
    "delete",
    "from",
    "where",
    "innerJoin",
    "set",
    "values",
  ] as const)
    mockDb[m].mockReturnThis()
  mockDb.limit.mockImplementation(() => nextResult())
  mockDb.returning.mockImplementation(() => nextResult())
}

describe("mobile milestone create/delete", () => {
  beforeEach(reset)

  it("POST /api/mobile/tasks creates a milestone (201)", async () => {
    queue.push([{ id: "proj-1" }]) // project ownership
    queue.push([{ maxOrder: 2 }]) // max sortOrder
    queue.push([{ id: "m-new", title: "M1" }]) // insert returning
    const { POST } = await import("@/app/api/mobile/tasks/route")
    const res = await POST(req("/api/mobile/tasks", "POST", { projectId: UID, title: "M1" }), ctx)
    expect(res.status).toBe(201)
  })

  it("POST /api/mobile/tasks 404 when project missing", async () => {
    queue.push([]) // no project
    const { POST } = await import("@/app/api/mobile/tasks/route")
    const res = await POST(req("/api/mobile/tasks", "POST", { projectId: UID, title: "M1" }), ctx)
    expect(res.status).toBe(404)
  })

  it("DELETE /api/mobile/tasks/[id] removes a milestone (204)", async () => {
    queue.push([{ id: "m-1", title: "M1" }]) // existing join
    const { DELETE } = await import("@/app/api/mobile/tasks/[id]/route")
    const res = await DELETE(req("/api/mobile/tasks/m-1", "DELETE"), ctx)
    expect(res.status).toBe(204)
  })
})

describe("mobile renovation project PATCH/DELETE", () => {
  beforeEach(reset)

  it("PATCH updates status (200)", async () => {
    queue.push([{ id: "r-1" }]) // existing
    queue.push([{ id: "r-1", status: "in_progress" }]) // update returning
    const { PATCH } = await import("@/app/api/mobile/renovation/projects/[id]/route")
    const res = await PATCH(
      req("/api/mobile/renovation/projects/r-1", "PATCH", { status: "in_progress" }),
      ctx
    )
    expect(res.status).toBe(200)
  })

  it("DELETE 404 when missing", async () => {
    queue.push([]) // not found
    const { DELETE } = await import("@/app/api/mobile/renovation/projects/[id]/route")
    const res = await DELETE(req("/api/mobile/renovation/projects/r-x", "DELETE"), ctx)
    expect(res.status).toBe(404)
  })
})

describe("mobile supplier create/update", () => {
  beforeEach(reset)

  it("POST creates a supplier (201)", async () => {
    queue.push([{ id: "sup-1", name: "Acme" }]) // insert returning
    const { POST } = await import("@/app/api/mobile/suppliers/route")
    const res = await POST(req("/api/mobile/suppliers", "POST", { name: "Acme" }), ctx)
    expect(res.status).toBe(201)
  })

  it("PATCH updates a supplier (200)", async () => {
    queue.push([{ id: "sup-1", name: "Acme" }]) // existing
    queue.push([{ id: "sup-1", status: "inactive" }]) // update returning
    const { PATCH } = await import("@/app/api/mobile/suppliers/[id]/route")
    const res = await PATCH(
      req("/api/mobile/suppliers/sup-1", "PATCH", { status: "inactive" }),
      ctx
    )
    expect(res.status).toBe(200)
  })
})
