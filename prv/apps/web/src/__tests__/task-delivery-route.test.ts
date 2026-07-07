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
  return { projectTasks: col() }
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
    url: "http://localhost/api/analytics/task-delivery",
    nextUrl: { pathname: "/api/analytics/task-delivery" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from"] as const) mockDb[m].mockReturnThis()
  mockDb.where.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/analytics/task-delivery", () => {
  beforeEach(reset)

  it("aggregates project tasks into a delivery view", async () => {
    const day = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10)
    queue.push([
      {
        status: "done",
        priority: "high",
        dueDate: day(-1),
        completedAt: new Date(Date.now() - 2 * 86_400_000),
      },
      { status: "todo", priority: "critical", dueDate: day(-3), completedAt: null },
      { status: "in_progress", priority: "medium", dueDate: day(5), completedAt: null },
      { status: "cancelled", priority: "low", dueDate: null, completedAt: null },
    ])
    const { GET } = await import("@/app/api/analytics/task-delivery/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(4)
    expect(body.done).toBe(1)
    expect(body.open).toBe(2)
    expect(body.overdue).toBe(1) // the overdue todo
    expect(body.byPriority[0].priority).toBe("critical")
  })

  it("handles no tasks", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/task-delivery/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.total).toBe(0)
    expect(body.completionRatePct).toBeNull()
  })
})
