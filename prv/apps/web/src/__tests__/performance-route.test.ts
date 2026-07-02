import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
const auditSpy = vi.fn().mockResolvedValue(undefined)
vi.mock("@prv/auth", () => ({ writeAuditLog: auditSpy, RoleSets: { admin: [] } }))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["attendanceRecords", "tasks", "performanceRatings", "users"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), gte: vi.fn(), lte: vi.fn(), isNull: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function getReq(qs = "") {
  return {
    method: "GET",
    nextUrl: { pathname: "/api/workforce/performance", searchParams: new URLSearchParams(qs) },
    url: `http://localhost/api/workforce/performance?${qs}`,
    headers: { get: () => null },
  } as unknown as Request
}
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: { pathname: "/api/workforce/performance", searchParams: new URLSearchParams() },
    url: "http://localhost/api/workforce/performance",
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of [
    "select",
    "from",
    "where",
    "insert",
    "values",
    "onConflictDoUpdate",
    "returning",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("/api/workforce/performance", () => {
  beforeEach(reset)

  it("GET derives per-employee metrics, ranks by composite, and summarizes", async () => {
    // attendance: u1 5 worked (1 late), u2 4 present + 1 absent, plus a u1 leave day (excluded)
    queue.push([
      { userId: "u1", status: "present", lateMinutes: 0 },
      { userId: "u1", status: "present", lateMinutes: 0 },
      { userId: "u1", status: "present", lateMinutes: 0 },
      { userId: "u1", status: "present", lateMinutes: 0 },
      { userId: "u1", status: "late", lateMinutes: 10 },
      { userId: "u1", status: "leave", lateMinutes: null },
      { userId: "u2", status: "present", lateMinutes: 0 },
      { userId: "u2", status: "present", lateMinutes: 0 },
      { userId: "u2", status: "present", lateMinutes: 0 },
      { userId: "u2", status: "present", lateMinutes: 0 },
      { userId: "u2", status: "absent", lateMinutes: null },
    ])
    // tasks: u1 3/4, u2 1/2
    queue.push([
      { assigneeUserId: "u1", status: "done" },
      { assigneeUserId: "u1", status: "done" },
      { assigneeUserId: "u1", status: "done" },
      { assigneeUserId: "u1", status: "todo" },
      { assigneeUserId: "u2", status: "done" },
      { assigneeUserId: "u2", status: "in_progress" },
    ])
    // ratings: u1 latest 5 (later), older 3
    queue.push([
      { userId: "u1", rating: 3, createdAt: new Date("2026-01-01T00:00:00Z") },
      { userId: "u1", rating: 5, createdAt: new Date("2026-06-01T00:00:00Z") },
    ])
    // users
    queue.push([
      { id: "u1", firstName: "Elena", lastName: "Vasile", jobTitle: "PM" },
      { id: "u2", firstName: "Radu", lastName: "Gheorghe", jobTitle: "Carpenter" },
    ])

    const { GET } = await import("@/app/api/workforce/performance/route")
    const res = await GET(getReq("from=2026-06-01&to=2026-06-30"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.rows).toHaveLength(2)
    expect(body.rows[0]).toMatchObject({
      userId: "u1",
      attendanceRate: 100,
      punctualityRate: 80,
      taskCompletionRate: 75,
      rating: 5,
      composite: 88.5,
    })
    expect(body.rows[1]).toMatchObject({
      userId: "u2",
      attendanceRate: 80,
      punctualityRate: 100,
      taskCompletionRate: 50,
      composite: 73.8,
    })
    expect(body.summary).toMatchObject({
      people: 2,
      topPerformerId: "u1",
      needsAttentionId: "u2",
      avgComposite: 81.2,
    })
  })

  it("POST records a manager rating and audit-logs it", async () => {
    queue.push([{ id: "r-new" }])
    const { POST } = await import("@/app/api/workforce/performance/route")
    const res = await POST(
      postReq({ userId: "11111111-1111-1111-1111-111111111111", period: "2026-Q2", rating: 4 }),
      ctx
    )
    expect(res.status).toBe(201)
    expect(mockDb.onConflictDoUpdate).toHaveBeenCalledTimes(1)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST rejects an out-of-range rating with 422", async () => {
    const { POST } = await import("@/app/api/workforce/performance/route")
    const res = await POST(
      postReq({ userId: "11111111-1111-1111-1111-111111111111", period: "2026-Q2", rating: 9 }),
      ctx
    )
    expect(res.status).toBe(422)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })
})
