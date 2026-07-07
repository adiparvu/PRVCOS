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
  return { payrollRuns: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), eq: vi.fn(), gte: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/analytics/payroll-cost",
    nextUrl: { pathname: "/api/analytics/payroll-cost" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from"] as const) mockDb[m].mockReturnThis()
  mockDb.where.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/analytics/payroll-cost", () => {
  beforeEach(reset)

  it("aggregates payroll runs into a cost view", async () => {
    queue.push([
      {
        type: "monthly",
        status: "done",
        totalGross: "10000",
        netPaid: "8000",
        employeeCount: 10,
        periodEnd: "2026-07-31",
      },
      {
        type: "weekly",
        status: "done",
        totalGross: "2000",
        netPaid: "1600",
        employeeCount: 8,
        periodEnd: "2026-07-07",
      },
    ])
    const { GET } = await import("@/app/api/analytics/payroll-cost/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.runs).toBe(2)
    expect(body.totalGross).toBe(12000)
    expect(body.deductions).toBe(2400)
    expect(body.employeeSlots).toBe(18)
    expect(body.byType[0].type).toBe("monthly")
  })

  it("handles no runs", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/payroll-cost/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.runs).toBe(0)
    expect(body.avgCostPerEmployee).toBe(0)
  })
})
