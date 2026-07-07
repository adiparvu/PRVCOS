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
  return { safetyTrainingRecords: col(), users: col() }
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
    url: "http://localhost/api/analytics/safety-training",
    nextUrl: { pathname: "/api/analytics/safety-training" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "leftJoin"] as const) mockDb[m].mockReturnThis()
  mockDb.where.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/analytics/safety-training", () => {
  beforeEach(reset)

  it("builds the expiry register with names, bands and compliance rate", async () => {
    const inDays = (d: number) => new Date(Date.now() + d * 86_400_000)
    queue.push([
      {
        id: "a",
        trainingName: "First Aid",
        provider: "RC",
        expiresAt: inDays(-5),
        firstName: "Ana",
        lastName: "Pop",
      },
      {
        id: "b",
        trainingName: "Working at Height",
        provider: "SafeCo",
        expiresAt: inDays(20),
        firstName: "Bo",
        lastName: "Ion",
      },
      {
        id: "c",
        trainingName: "Fire Safety",
        provider: null,
        expiresAt: null,
        firstName: null,
        lastName: null,
      },
    ])
    const { GET } = await import("@/app/api/analytics/safety-training/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(3)
    expect(body.expired).toBe(1)
    expect(body.complianceRatePct).toBe(66.7) // 2 of 3 not expired
    // most overdue first
    expect(body.records[0].id).toBe("a")
    expect(body.records[0].userName).toBe("Ana Pop")
    expect(body.records[0].status).toBe("expired")
    const c = body.records.find((r: { id: string }) => r.id === "c")
    expect(c.userName).toBe("Unknown")
    expect(c.status).toBe("valid")
  })

  it("handles a company with no training records", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/safety-training/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.total).toBe(0)
    expect(body.complianceRatePct).toBeNull()
  })
})
