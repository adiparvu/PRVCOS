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
  return { safetyIncidents: col() }
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
    url: "http://localhost/api/analytics/safety-metrics",
    nextUrl: { pathname: "/api/analytics/safety-metrics" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from"] as const) mockDb[m].mockReturnThis()
  mockDb.where.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/analytics/safety-metrics", () => {
  beforeEach(reset)

  it("aggregates incidents into safety metrics", async () => {
    const iso = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()
    queue.push([
      { type: "accident", incidentAt: new Date(iso(10)), location: "Site B" },
      { type: "property_damage", incidentAt: new Date(iso(20)), location: "Site B" },
      { type: "near_miss", incidentAt: new Date(iso(2)), location: "Site B" },
      { type: "property_damage", incidentAt: new Date(iso(40)), location: "Site A" },
    ])
    const { GET } = await import("@/app/api/analytics/safety-metrics/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(4)
    expect(body.recordable).toBe(3)
    expect(body.nearMiss).toBe(1)
    // last recordable is the accident 10 days ago (near-miss doesn't reset)
    expect(body.daysSinceLastIncident).toBe(10)
    expect(body.highRiskLocation).toBe("Site B")
  })

  it("handles a company with no incidents", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/safety-metrics/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.total).toBe(0)
    expect(body.daysSinceLastIncident).toBeNull()
  })
})
