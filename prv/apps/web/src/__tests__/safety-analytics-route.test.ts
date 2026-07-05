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
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
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
    url: "http://localhost/api/analytics/safety",
    nextUrl: { pathname: "/api/analytics/safety", searchParams: new URLSearchParams() },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "where"] as const) mockDb[m].mockReturnThis()
}

describe("GET /api/analytics/safety", () => {
  beforeEach(reset)

  it("aggregates incidents into risk index, injuries and resolution stats", async () => {
    queue.push([
      {
        severity: "critical",
        type: "accident",
        status: "open",
        injuriesCount: 2,
        incidentAt: new Date("2026-01-01T00:00:00.000Z"),
        closedAt: null,
      },
      {
        severity: "high",
        type: "near_miss",
        status: "resolved",
        injuriesCount: 0,
        incidentAt: new Date("2026-01-01T00:00:00.000Z"),
        closedAt: new Date("2026-01-05T00:00:00.000Z"),
      },
    ])
    const { GET } = await import("@/app/api/analytics/safety/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(2)
    expect(body.open).toBe(1)
    expect(body.injuriesTotal).toBe(2)
    expect(body.riskIndex).toBe(15) // only the open critical
    expect(body.riskBand).toBe("critical")
    expect(body.resolvedCount).toBe(1)
    expect(body.mttrDays).toBe(4)
  })

  it("handles a company with no incidents", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/safety/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.total).toBe(0)
    expect(body.riskBand).toBe("stable")
    expect(body.mttrDays).toBeNull()
  })
})
