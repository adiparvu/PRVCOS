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
  where: vi.fn((..._a: unknown[]) => Promise.resolve(nextResult())),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { orders: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), eq: vi.fn(), gte: vi.fn(), isNull: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/analytics/order-analytics",
    nextUrl: { pathname: "/api/analytics/order-analytics" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from"] as const) mockDb[m].mockReturnThis()
  mockDb.where.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/analytics/order-analytics", () => {
  beforeEach(reset)

  it("aggregates the order ledger into fulfillment analytics", async () => {
    const now = new Date()
    queue.push([
      { status: "delivered", total: "1000", createdAt: now },
      { status: "processing", total: "500", createdAt: now },
      { status: "cancelled", total: "900", createdAt: now },
      { status: "refunded", total: "400", createdAt: now },
    ])
    const { GET } = await import("@/app/api/analytics/order-analytics/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalOrders).toBe(4)
    expect(body.revenue).toBe(1500) // cancelled + refunded excluded
    expect(body.aov).toBe(750)
    expect(body.delivered).toBe(1)
    expect(body.cancelledOrRefunded).toBe(2)
    expect(body.cancelRatePct).toBe(50)
  })

  it("handles no orders", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/order-analytics/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.totalOrders).toBe(0)
    expect(body.fulfilledRatePct).toBeNull()
  })
})
