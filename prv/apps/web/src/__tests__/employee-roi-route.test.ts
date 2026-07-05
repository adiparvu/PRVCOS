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
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { payrollItems: col(), projectTasks: col(), users: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), eq: vi.fn(), isNotNull: vi.fn(), count: vi.fn(), sum: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/analytics/employee-roi",
    nextUrl: { pathname: "/api/analytics/employee-roi", searchParams: new URLSearchParams() },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "leftJoin", "where", "groupBy"] as const)
    mockDb[m].mockReturnThis()
}

describe("GET /api/analytics/employee-roi", () => {
  beforeEach(reset)

  it("joins payroll gross to completed-task counts per employee", async () => {
    // Promise.all order: costRows, taskRows
    queue.push([
      { userId: "a", firstName: "Ana", lastName: "Pop", cost: "2000" },
      { userId: "b", firstName: "Bogdan", lastName: "Ion", cost: "6000" },
    ])
    queue.push([
      { assigneeId: "a", cnt: 10 },
      { assigneeId: "b", cnt: 10 },
    ])
    const { GET } = await import("@/app/api/analytics/employee-roi/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    const byId = Object.fromEntries(body.employees.map((e: { userId: string }) => [e.userId, e]))
    expect(byId.a.name).toBe("Ana Pop")
    expect(byId.a.costPerTask).toBe(200)
    expect(byId.a.band).toBe("high")
    expect(byId.b.costPerTask).toBe(600)
    expect(byId.b.band).toBe("low")
    expect(body.totalCost).toBe(8000)
    expect(body.totalTasks).toBe(20)
    // cheapest cost-per-task ranked first
    expect(body.employees[0].userId).toBe("a")
  })

  it("treats a paid employee with no completed tasks as no_output", async () => {
    queue.push([{ userId: "idle", firstName: "Idle", lastName: "One", cost: "4000" }])
    queue.push([]) // no completed tasks
    const { GET } = await import("@/app/api/analytics/employee-roi/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.employees[0].costPerTask).toBeNull()
    expect(body.employees[0].band).toBe("no_output")
    expect(body.noOutputCount).toBe(1)
  })

  it("skips payroll rows without a linked user", async () => {
    queue.push([{ userId: null, firstName: null, lastName: null, cost: "999" }])
    queue.push([])
    const { GET } = await import("@/app/api/analytics/employee-roi/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.employees).toHaveLength(0)
    expect(body.totalCost).toBe(0)
  })
})
