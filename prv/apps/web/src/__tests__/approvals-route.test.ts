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
  return { approvalRequests: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/analytics/approvals",
    nextUrl: { pathname: "/api/analytics/approvals" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from"] as const) mockDb[m].mockReturnThis()
  mockDb.where.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/analytics/approvals", () => {
  beforeEach(reset)

  it("aggregates the approval ledger into queue health", async () => {
    const hAgo = (h: number) => new Date(Date.now() - h * 3_600_000)
    queue.push([
      { type: "purchase", status: "pending", createdAt: hAgo(72), resolvedAt: null },
      { type: "leave", status: "approved", createdAt: hAgo(30), resolvedAt: hAgo(20) },
      { type: "expense", status: "rejected", createdAt: hAgo(40), resolvedAt: hAgo(20) },
    ])
    const { GET } = await import("@/app/api/analytics/approvals/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(3)
    expect(body.open).toBe(1)
    expect(body.stale).toBe(1) // pending 72h
    expect(body.approvalRatePct).toBe(50) // 1 approved of 2 decided
    expect(body.byType.length).toBe(3)
  })

  it("handles an empty queue", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/approvals/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.total).toBe(0)
    expect(body.approvalRatePct).toBeNull()
  })
})
