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
  return { candidates: col() }
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
    url: "http://localhost/api/analytics/recruitment-funnel",
    nextUrl: { pathname: "/api/analytics/recruitment-funnel" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from"] as const) mockDb[m].mockReturnThis()
  mockDb.where.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/analytics/recruitment-funnel", () => {
  beforeEach(reset)

  it("aggregates candidates into a hiring funnel", async () => {
    queue.push([
      { stage: "sourcing", source: "LinkedIn" },
      { stage: "screening", source: "LinkedIn" },
      { stage: "interview", source: "Referral" },
      { stage: "hired", source: "Referral" },
      { stage: "rejected", source: "Board" },
    ])
    const { GET } = await import("@/app/api/analytics/recruitment-funnel/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(5)
    expect(body.hired).toBe(1)
    expect(body.rejected).toBe(1)
    expect(body.funnel[0].count).toBe(4) // 4 non-rejected entered sourcing
    expect(body.funnel[6].count).toBe(1) // hired
    expect(body.bySource[0].source).toBe("LinkedIn")
  })

  it("handles no candidates", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/recruitment-funnel/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.total).toBe(0)
    expect(body.overallConversionPct).toBeNull()
  })
})
