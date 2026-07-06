import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
  RoleSets: {},
  hasScope: () => false, // not a platform admin; membership must exist
}))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
// Every terminal await resolves through `then`, pulled in await order.
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return {
    companyGroups: col(),
    groupMemberships: col(),
    companies: col(),
    kpiDailySnapshots: col(),
  }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), desc: vi.fn(), eq: vi.fn(), gte: vi.fn(), inArray: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1", scopeLevel: "SCOPE_GROUP" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    nextUrl: { pathname: "/api/groups/group-1/health" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "innerJoin", "where", "orderBy", "limit"] as const)
    mockDb[m].mockReturnThis()
}

describe("GET /api/groups/[groupId]/health", () => {
  beforeEach(reset)

  it("builds a per-company health breakdown with delta, band and average", async () => {
    // await order: membership, memberRows, groupRow, snapshotRows
    queue.push([{ id: "m1" }]) // membership → authorized
    queue.push([
      { companyId: "a", name: "Renovations" },
      { companyId: "b", name: "Shop" },
    ])
    queue.push([{ name: "PRV Group" }])
    // snapshots newest → oldest, interleaved by company
    queue.push([
      { companyId: "a", date: "2026-07-06", healthScore: 84 },
      { companyId: "b", date: "2026-07-06", healthScore: 58 },
      { companyId: "a", date: "2026-07-05", healthScore: 81 },
      { companyId: "b", date: "2026-07-05", healthScore: 64 },
    ])

    const { GET } = await import("@/app/api/groups/[groupId]/health/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.group.name).toBe("PRV Group")
    // worst score first
    expect(body.companies.map((c: { companyId: string }) => c.companyId)).toEqual(["b", "a"])
    const a = body.companies.find((c: { companyId: string }) => c.companyId === "a")
    expect(a.score).toBe(84)
    expect(a.delta).toBe(3)
    expect(a.band).toBe("good")
    const b = body.companies.find((c: { companyId: string }) => c.companyId === "b")
    expect(b.delta).toBe(-6)
    expect(b.band).toBe("attention")
    expect(body.averageScore).toBe(71)
    expect(body.reporting).toBe(2)
  })

  it("404s when the caller's company is not in the group", async () => {
    queue.push([]) // no membership, hasScope=false
    const { GET } = await import("@/app/api/groups/[groupId]/health/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(404)
  })
})
