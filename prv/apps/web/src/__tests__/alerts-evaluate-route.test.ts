import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
vi.mock("@prv/auth", () => ({ writeAuditLog: vi.fn(), RoleSets: { admin: [] } }))

const selectQueue: unknown[][] = []
const inserted: unknown[][] = []
const nextSelect = () => (selectQueue.length ? (selectQueue.shift() ?? []) : [])

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn((..._a: unknown[]) => Promise.resolve(nextSelect())),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn((rows: unknown[]) => {
    inserted.push(rows as unknown[])
    return Promise.resolve()
  }),
  then: (resolve: (v: unknown[]) => void) => resolve(nextSelect()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { alerts: col(), kpiDailySnapshots: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), desc: vi.fn(), eq: vi.fn(), inArray: vi.fn(), ne: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "POST",
    url: "http://localhost/api/alerts/evaluate",
    nextUrl: { pathname: "/api/alerts/evaluate" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  selectQueue.length = 0
  inserted.length = 0
  for (const m of ["select", "from", "where", "orderBy", "insert", "values"] as const)
    mockDb[m].mockReturnThis()
  mockDb.limit.mockImplementation(() => Promise.resolve(nextSelect()))
  mockDb.values.mockImplementation((rows: unknown[]) => {
    inserted.push(rows)
    return Promise.resolve()
  })
}

describe("POST /api/alerts/evaluate", () => {
  beforeEach(reset)

  it("creates alerts for triggered rules and dedupes against open ones", async () => {
    // snapshots (newest → oldest): revenue dropped 100k→70k (-30% → L2),
    // attendance 6/10 = 60% (< 70 → L2), health 40 (< 50 → L3)
    selectQueue.push([
      { revenueMonth: "70000", headcount: 10, presentToday: 6, healthScore: 40 },
      { revenueMonth: "100000", headcount: 10, presentToday: 9, healthScore: 80 },
    ])
    // an open alert already exists for the attendance rule → should be skipped
    selectQueue.push([{ source: "rule:attendance_cliff" }])

    const { POST } = await import("@/app/api/alerts/evaluate/route")
    const res = await POST(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.evaluated).toBe(3)
    expect(body.created).toContain("revenue_drop")
    expect(body.created).toContain("health_critical")
    expect(body.skipped).toContain("attendance_cliff")
    // one insert call with the two fresh alerts
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toHaveLength(2)
    const sources = (inserted[0] as { source: string }[]).map((r) => r.source)
    expect(sources).toEqual(expect.arrayContaining(["rule:revenue_drop", "rule:health_critical"]))
  })

  it("returns an empty result when no rules trigger", async () => {
    selectQueue.push([
      { revenueMonth: "100000", headcount: 10, presentToday: 10, healthScore: 90 },
      { revenueMonth: "100000", headcount: 10, presentToday: 10, healthScore: 90 },
    ])
    const { POST } = await import("@/app/api/alerts/evaluate/route")
    const body = await (await POST(rq(), ctx)).json()
    expect(body.evaluated).toBe(0)
    expect(body.created).toEqual([])
    expect(inserted).toHaveLength(0)
  })

  it("handles a company with no snapshots", async () => {
    selectQueue.push([])
    const { POST } = await import("@/app/api/alerts/evaluate/route")
    const body = await (await POST(rq(), ctx)).json()
    expect(body.evaluated).toBe(0)
    expect(inserted).toHaveLength(0)
  })
})
