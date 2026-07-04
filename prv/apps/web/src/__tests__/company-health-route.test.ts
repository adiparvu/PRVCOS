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
    url: "http://localhost/api/analytics/company-health",
    nextUrl: { pathname: "/api/analytics/company-health", searchParams: new URLSearchParams() },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "where", "orderBy", "limit"] as const)
    mockDb[m].mockReturnThis()
}

describe("GET /api/analytics/company-health", () => {
  beforeEach(reset)

  it("computes the composite + domains from the latest snapshot", async () => {
    queue.push([
      {
        snapshotDate: "2026-07-03",
        revenueMonth: "100000",
        grossProfit: "30000",
        overdueAmount: "10000",
        totalTasks: 200,
        doneTasks: 160,
        headcount: 100,
        presentToday: 90,
        pipelineValue: "300000",
        activeLeads: 40,
      },
    ])
    const { GET } = await import("@/app/api/analytics/company-health/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.date).toBe("2026-07-03")
    expect(body.composite).toBe(81)
    expect(body.band).toBe("excellent")
    expect(body.domains.map((d: { key: string }) => d.key)).toEqual([
      "finance",
      "projects",
      "people",
      "sales",
    ])
  })

  it("handles no snapshot", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/company-health/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.date).toBeNull()
    expect(body.domains).toHaveLength(4)
  })
})
