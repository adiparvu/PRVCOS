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
    url: "http://localhost/api/analytics/trends",
    nextUrl: { pathname: "/api/analytics/trends", searchParams: new URLSearchParams() },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "where", "orderBy", "limit"] as const)
    mockDb[m].mockReturnThis()
}

describe("GET /api/analytics/trends", () => {
  beforeEach(reset)

  it("reverses newest-first rows and computes trends chronologically", async () => {
    // DB returns newest → oldest
    queue.push([
      {
        snapshotDate: "2026-07-03",
        revenueMonth: "130",
        overdueAmount: "40",
        activeProjects: 27,
        activeLeads: 40,
        headcount: 140,
        healthScore: 78,
        grossProfit: "58000",
        pipelineValue: "184000",
      },
      {
        snapshotDate: "2026-07-02",
        revenueMonth: "110",
        overdueAmount: "45",
        activeProjects: 25,
        activeLeads: 42,
        headcount: 140,
        healthScore: 74,
        grossProfit: "54000",
        pipelineValue: "170000",
      },
      {
        snapshotDate: "2026-07-01",
        revenueMonth: "100",
        overdueAmount: "50",
        activeProjects: 24,
        activeLeads: 45,
        headcount: 140,
        healthScore: 73,
        grossProfit: "52000",
        pipelineValue: "160000",
      },
    ])
    const { GET } = await import("@/app/api/analytics/trends/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.from).toBe("2026-07-01")
    expect(body.to).toBe("2026-07-03")
    const rev = body.trends.find((t: { key: string }) => t.key === "revenueMonth")
    expect(rev.current).toBe(130)
    expect(rev.previous).toBe(100)
    expect(rev.deltaPct).toBe(30)
    expect(rev.sparkline).toEqual([100, 110, 130])
    const overdue = body.trends.find((t: { key: string }) => t.key === "overdueAmount")
    expect(overdue.positive).toBe(true) // fell 50 → 40, favourable
    const leads = body.trends.find((t: { key: string }) => t.key === "activeLeads")
    expect(leads.positive).toBe(false) // fell 45 → 40, unfavourable
  })

  it("handles no snapshots", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/trends/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.from).toBeNull()
    expect(body.trends[0].sparkline).toEqual([])
  })
})
