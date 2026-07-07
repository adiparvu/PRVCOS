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
  where: vi.fn((..._a: unknown[]) => Promise.resolve(nextResult())),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { courseEnrollments: col(), learningCourses: col() }
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
    url: "http://localhost/api/analytics/learning-completion",
    nextUrl: { pathname: "/api/analytics/learning-completion" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "leftJoin"] as const) mockDb[m].mockReturnThis()
  mockDb.where.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/analytics/learning-completion", () => {
  beforeEach(reset)

  it("aggregates enrollments into completion metrics", async () => {
    queue.push([
      { courseId: "a", status: "completed", progressPct: 100, courseTitle: "Onboarding" },
      { courseId: "a", status: "in_progress", progressPct: 50, courseTitle: "Onboarding" },
      { courseId: "b", status: "new", progressPct: 0, courseTitle: "Safety 101" },
    ])
    const { GET } = await import("@/app/api/analytics/learning-completion/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalEnrollments).toBe(3)
    expect(body.completed).toBe(1)
    expect(body.completionRatePct).toBe(33.3)
    expect(body.courses[0].courseId).toBe("a") // most enrolled
    expect(body.courses[0].title).toBe("Onboarding")
  })

  it("handles no enrollments", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/learning-completion/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.totalEnrollments).toBe(0)
    expect(body.completionRatePct).toBeNull()
  })
})
