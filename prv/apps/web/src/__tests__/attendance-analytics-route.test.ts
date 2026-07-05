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
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { attendanceRecords: col(), users: col() }
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
    url: "http://localhost/api/analytics/attendance",
    nextUrl: { pathname: "/api/analytics/attendance", searchParams: new URLSearchParams() },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "leftJoin", "where"] as const) mockDb[m].mockReturnThis()
}

describe("GET /api/analytics/attendance", () => {
  beforeEach(reset)

  it("aggregates records into rates, status mix and a watchlist", async () => {
    queue.push([
      { userId: "a", firstName: "Ana", lastName: "Pop", status: "present", lateMinutes: null },
      { userId: "a", firstName: "Ana", lastName: "Pop", status: "present", lateMinutes: null },
      { userId: "b", firstName: "Bogdan", lastName: "Ion", status: "absent", lateMinutes: null },
      { userId: "b", firstName: "Bogdan", lastName: "Ion", status: "late", lateMinutes: 20 },
    ])
    const { GET } = await import("@/app/api/analytics/attendance/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.periodDays).toBe(30)
    expect(body.total).toBe(4)
    // scheduled 4, showed 3 (2 present + 1 late) → 75%
    expect(body.attendanceRate).toBe(75)
    expect(body.byStatus.absent).toBe(1)
    expect(body.avgLateMinutes).toBe(20)
    // Bogdan: 1 late + 1 absent of 2 scheduled = 50% → poor, on the watchlist
    const bog = body.watchlist.find((w: { userId: string }) => w.userId === "b")
    expect(bog.band).toBe("poor")
    expect(body.watchlist.some((w: { userId: string }) => w.userId === "a")).toBe(false)
  })

  it("handles a company with no attendance records", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/attendance/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.total).toBe(0)
    expect(body.attendanceRate).toBe(100)
    expect(body.watchlist).toHaveLength(0)
  })
})
