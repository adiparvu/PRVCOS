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
  return { expenses: col() }
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
    url: "http://localhost/api/analytics/expense-breakdown",
    nextUrl: { pathname: "/api/analytics/expense-breakdown" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from"] as const) mockDb[m].mockReturnThis()
  mockDb.where.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/analytics/expense-breakdown", () => {
  beforeEach(reset)

  it("aggregates the expense ledger into committed spend by category", async () => {
    const today = new Date().toISOString().slice(0, 10)
    queue.push([
      { category: "materials", status: "approved", amount: "1000", date: today },
      { category: "materials", status: "paid", amount: "500", date: today },
      { category: "labor", status: "submitted", amount: "300", date: today },
      { category: "rent", status: "draft", amount: "999", date: today },
    ])
    const { GET } = await import("@/app/api/analytics/expense-breakdown/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalSpend).toBe(1500)
    expect(body.paidAmount).toBe(500)
    expect(body.pendingAmount).toBe(300)
    expect(body.byCategory[0]).toEqual({ category: "materials", amount: 1500 })
    expect(body.months).toHaveLength(6)
  })

  it("handles an empty ledger", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/expense-breakdown/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.totalSpend).toBe(0)
    expect(body.byCategory).toEqual([])
  })
})
