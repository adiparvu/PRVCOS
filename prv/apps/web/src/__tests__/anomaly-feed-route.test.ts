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
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { kpiDailySnapshots: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, desc: vi.fn(), eq: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/analytics/anomalies",
    nextUrl: { pathname: "/api/analytics/anomalies", searchParams: new URLSearchParams() },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "where", "orderBy", "limit"] as const)
    mockDb[m].mockReturnThis()
}

describe("GET /api/analytics/anomalies", () => {
  beforeEach(reset)

  it("detects day-over-day anomalies from the two newest snapshots", async () => {
    // newest → oldest as the DB returns
    queue.push([
      {
        snapshotDate: "2026-07-03",
        revenueMonth: "130",
        overdueAmount: "18400",
        activeProjects: 27,
        activeLeads: 32,
        headcount: 140,
        healthScore: 78,
        grossProfit: "58000",
        pipelineValue: "184000",
      },
      {
        snapshotDate: "2026-07-02",
        revenueMonth: "100",
        overdueAmount: "8000",
        activeProjects: 27,
        activeLeads: 45,
        headcount: 140,
        healthScore: 78,
        grossProfit: "58000",
        pipelineValue: "184000",
      },
    ])
    const { GET } = await import("@/app/api/analytics/anomalies/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.date).toBe("2026-07-03")
    // overdue +130% (critical, unfavourable), revenue +30% (warning), leads -28.9% (warning, unfavourable)
    expect(body.anomalies[0].key).toBe("overdueAmount")
    expect(body.anomalies[0].severity).toBe("critical")
    expect(body.meta.critical).toBe(1)
    expect(body.meta.unfavourable).toBeGreaterThanOrEqual(2)
  })

  it("returns no anomalies with a single snapshot", async () => {
    queue.push([{ snapshotDate: "2026-07-03", revenueMonth: "130" }])
    const { GET } = await import("@/app/api/analytics/anomalies/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.anomalies).toEqual([])
    expect(body.meta.total).toBe(0)
  })
})
