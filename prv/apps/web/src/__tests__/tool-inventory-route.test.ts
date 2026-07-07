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
  return { tools: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), eq: vi.fn(), isNull: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/analytics/tool-inventory",
    nextUrl: { pathname: "/api/analytics/tool-inventory" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from"] as const) mockDb[m].mockReturnThis()
  mockDb.where.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/analytics/tool-inventory", () => {
  beforeEach(reset)

  it("rolls the tool register into an availability view", async () => {
    queue.push([
      { status: "available", category: "Power", warrantyExpiresAt: null },
      { status: "in_use", category: "Power", warrantyExpiresAt: new Date(Date.now() - 86_400_000) },
      { status: "in_use", category: "Hand", warrantyExpiresAt: null },
      { status: "lost", category: "Hand", warrantyExpiresAt: null },
    ])
    const { GET } = await import("@/app/api/analytics/tool-inventory/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(4)
    expect(body.inUse).toBe(2)
    expect(body.lost).toBe(1)
    expect(body.operable).toBe(3) // available(1) + in_use(2)
    expect(body.utilizationPct).toBe(66.7)
    expect(body.warrantyExpired).toBe(1)
    const power = body.byCategory.find((c: { category: string }) => c.category === "Power")
    expect(power).toEqual({ category: "Power", total: 2, inUse: 1 })
  })

  it("handles an empty register", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/tool-inventory/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.total).toBe(0)
    expect(body.utilizationPct).toBeNull()
  })
})
