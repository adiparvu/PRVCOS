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
  // count queries terminate at .where(), which awaits the thenable db
  then: (resolve: (v: unknown[]) => void) => resolve(nextSelect()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return {
    alerts: col(),
    approvalRequests: col(),
    kpiDailySnapshots: col(),
    safetyIncidents: col(),
    stockLevels: col(),
  }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    and: vi.fn(),
    count: vi.fn(),
    countDistinct: vi.fn(),
    desc: vi.fn(),
    eq: vi.fn(),
    gt: vi.fn(),
    inArray: vi.fn(),
    isNotNull: vi.fn(),
    lt: vi.fn(),
    ne: vi.fn(),
    sql: vi.fn(),
  }
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

  it("triggers snapshot + live signal rules and dedupes against open alerts", async () => {
    // query order: snapshot, safety, stockout, approvals, open-alerts
    selectQueue.push([
      { revenueMonth: "70000", headcount: 10, presentToday: 6, healthScore: 40 }, // -30%, 60%, health 40
      { revenueMonth: "100000", headcount: 10, presentToday: 9, healthScore: 80 },
    ])
    selectQueue.push([{ n: 1 }]) // openCriticalSafety → L3
    selectQueue.push([{ n: 2 }]) // stockoutRisk → L3
    selectQueue.push([{ n: 3 }]) // overdueApprovals → L2
    selectQueue.push([{ source: "rule:attendance_cliff" }]) // already open → skipped

    const { POST } = await import("@/app/api/alerts/evaluate/route")
    const res = await POST(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    // revenue_drop, attendance_cliff, health_critical, safety_incident,
    // inventory_stockout, approvals_stale = 6 rules evaluated
    expect(body.evaluated).toBe(6)
    expect(body.created).toEqual(
      expect.arrayContaining([
        "revenue_drop",
        "health_critical",
        "safety_incident",
        "inventory_stockout",
        "approvals_stale",
      ])
    )
    expect(body.skipped).toContain("attendance_cliff")
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toHaveLength(5)
    const sources = (inserted[0] as { source: string }[]).map((r) => r.source)
    expect(sources).toContain("rule:safety_incident")
    expect(sources).toContain("rule:inventory_stockout")
  })

  it("returns an empty result when no rules trigger", async () => {
    selectQueue.push([
      { revenueMonth: "100000", headcount: 10, presentToday: 10, healthScore: 90 },
      { revenueMonth: "100000", headcount: 10, presentToday: 10, healthScore: 90 },
    ])
    selectQueue.push([{ n: 0 }]) // safety
    selectQueue.push([{ n: 0 }]) // stockout
    selectQueue.push([{ n: 0 }]) // approvals
    const { POST } = await import("@/app/api/alerts/evaluate/route")
    const body = await (await POST(rq(), ctx)).json()
    expect(body.evaluated).toBe(0)
    expect(body.created).toEqual([])
    expect(inserted).toHaveLength(0)
  })

  it("handles a company with no snapshots but still checks live signals", async () => {
    selectQueue.push([]) // no snapshots
    selectQueue.push([{ n: 1 }]) // safety incident open → still triggers
    selectQueue.push([{ n: 0 }]) // stockout
    selectQueue.push([{ n: 0 }]) // approvals
    selectQueue.push([]) // no open alerts
    const { POST } = await import("@/app/api/alerts/evaluate/route")
    const body = await (await POST(rq(), ctx)).json()
    expect(body.evaluated).toBe(1)
    expect(body.created).toEqual(["safety_incident"])
    expect(inserted).toHaveLength(1)
  })
})
