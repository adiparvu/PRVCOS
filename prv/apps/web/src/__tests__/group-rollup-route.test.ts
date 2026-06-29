import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
  RoleSets: { admin: [], management: [] },
  hasScope: (scope: string) => scope === "SCOPE_PLATFORM",
}))

vi.mock("@prv/db/queries/group-kpis", () => ({
  queryGroupKpis: vi.fn(async () => ({
    totalRevenue: "0",
    totalActiveProjects: 0,
    totalActiveEmployees: 0,
    totalOpenAlerts: 0,
    companiesIncluded: 0,
    periodKey: "2026-06",
  })),
}))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  groupBy: vi.fn(() => Promise.resolve(nextResult())),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(() => Promise.resolve(nextResult())),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const tables = [
    "companyGroups",
    "groupMemberships",
    "companies",
    "invoices",
    "projects",
    "companyMemberships",
    "groupKpiSnapshots",
  ]
  const mod: Record<string, unknown> = {}
  for (const t of tables) mod[t] = col()
  return mod
})

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    isNull: vi.fn(),
    inArray: vi.fn(),
    asc: vi.fn(),
    desc: vi.fn(),
    sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  }
})

function makeReq(scopeLevel: string, period?: string) {
  const search = new URLSearchParams(period ? { period } : {})
  return {
    req: {
      method: "GET",
      nextUrl: { pathname: "/api/groups/g1/rollup", searchParams: search },
      url: `http://localhost/api/groups/g1/rollup${period ? `?period=${period}` : ""}`,
      headers: { get: () => null },
    } as unknown as Request,
    ctx: {
      session: { companyId: "company-1", userId: "user-1", sessionId: "session-1", scopeLevel },
      ipAddress: "127.0.0.1",
      userAgent: "test",
    },
  }
}

function reset() {
  vi.clearAllMocks()
  queue.length = 0
  mockDb.select.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.innerJoin.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.groupBy.mockImplementation(() => Promise.resolve(nextResult()))
  mockDb.limit.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/groups/[groupId]/rollup", () => {
  beforeEach(reset)

  it("returns 404 when the caller is neither a member nor a platform admin", async () => {
    const { GET } = await import("@/app/api/groups/[groupId]/rollup/route")
    const { req, ctx } = makeReq("SCOPE_COMPANY")
    const res = await GET(req, ctx)
    expect(res.status).toBe(404)
  })

  it("returns the rollup shape for a platform admin", async () => {
    const { GET } = await import("@/app/api/groups/[groupId]/rollup/route")
    const { req, ctx } = makeReq("SCOPE_PLATFORM")
    const res = await GET(req, ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.group).toBeDefined()
    expect(body.kpis).toBeDefined()
    expect(body.kpis.totalActiveProjects).toBe(0)
    expect(body.period).toBe("qtd")
    expect(body.trend).toEqual({ labels: [], revenue: [] })
    expect(Array.isArray(body.breakdown)).toBe(true)
  })

  it("echoes a valid period and falls back to qtd for an invalid one", async () => {
    const { GET } = await import("@/app/api/groups/[groupId]/rollup/route")

    const ok = await GET(...(Object.values(makeReq("SCOPE_PLATFORM", "1w")) as [Request, never]))
    expect((await ok.json()).period).toBe("1w")

    const bad = await GET(
      ...(Object.values(makeReq("SCOPE_PLATFORM", "bogus")) as [Request, never])
    )
    expect((await bad.json()).period).toBe("qtd")
  })
})
