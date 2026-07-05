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
  groupBy: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { projects: col(), invoices: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), eq: vi.fn(), isNotNull: vi.fn(), isNull: vi.fn(), sum: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/analytics/project-profitability",
    nextUrl: {
      pathname: "/api/analytics/project-profitability",
      searchParams: new URLSearchParams(),
    },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "where", "groupBy"] as const) mockDb[m].mockReturnThis()
}

describe("GET /api/analytics/project-profitability", () => {
  beforeEach(reset)

  it("joins paid-invoice revenue to spent budget per project", async () => {
    // Promise.all order: projectRows, revenueRows
    queue.push([
      { id: "a", name: "Villa", budget: "120000", spentBudget: "96000" },
      { id: "b", name: "Office", budget: "70000", spentBudget: "76000" },
    ])
    queue.push([
      { projectId: "a", total: "142000" },
      { projectId: "b", total: "60000" },
    ])
    const { GET } = await import("@/app/api/analytics/project-profitability/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    const byId = Object.fromEntries(body.projects.map((p: { id: string }) => [p.id, p]))
    expect(byId.a.revenue).toBe(142000)
    expect(byId.a.cost).toBe(96000)
    expect(byId.a.profit).toBe(46000)
    expect(byId.b.profit).toBe(-16000)
    expect(byId.b.band).toBe("loss")
    expect(body.totalProfit).toBe(30000)
    expect(body.lossCount).toBe(1)
    // ranked most-profitable first
    expect(body.projects[0].id).toBe("a")
  })

  it("treats a project with no invoices as zero revenue", async () => {
    queue.push([{ id: "a", name: "Villa", budget: "100000", spentBudget: "40000" }])
    queue.push([]) // no revenue rows
    const { GET } = await import("@/app/api/analytics/project-profitability/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.projects[0].revenue).toBe(0)
    expect(body.projects[0].profit).toBe(-40000)
  })
})
