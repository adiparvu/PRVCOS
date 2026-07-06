import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
vi.mock("@prv/auth", () => ({ writeAuditLog: vi.fn(), RoleSets: { admin: [] } }))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn((..._a: unknown[]) => Promise.resolve(nextResult())),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { auditLogs: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), eq: vi.fn(), gte: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/command-center/module-status",
    nextUrl: { pathname: "/api/command-center/module-status" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "where"] as const) mockDb[m].mockReturnThis()
  mockDb.limit.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/command-center/module-status", () => {
  beforeEach(reset)

  it("aggregates audit events into a per-module status board", async () => {
    queue.push([
      { entityType: "invoice", gateFailed: false, createdAt: new Date("2026-07-06T09:00:00Z") },
      { entityType: "order", gateFailed: true, createdAt: new Date("2026-07-06T10:00:00Z") },
      { entityType: "project", gateFailed: false, createdAt: new Date("2026-07-06T08:00:00Z") },
    ])
    const { GET } = await import("@/app/api/command-center/module-status/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.windowHours).toBe(24)
    expect(body.summary.totalEvents).toBe(3)
    expect(body.summary.totalFailures).toBe(1)
    const shop = body.modules.find((m: { key: string }) => m.key === "shop")
    expect(shop.state).toBe("alert")
    // alert module ranked first
    expect(body.modules[0].key).toBe("shop")
  })

  it("returns all-idle modules for a company with no recent activity", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/command-center/module-status/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.summary.totalEvents).toBe(0)
    expect(body.modules.every((m: { state: string }) => m.state === "idle")).toBe(true)
  })
})
