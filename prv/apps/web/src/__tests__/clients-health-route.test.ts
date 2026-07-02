import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
vi.mock("@prv/auth", () => ({ writeAuditLog: vi.fn(), RoleSets: { admin: [] } }))
vi.mock("@prv/search", () => ({ upsertDocument: vi.fn() }))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["clients", "invoices", "projects", "crmActivities", "users"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    and: vi.fn(),
    count: vi.fn(),
    desc: vi.fn(),
    eq: vi.fn(),
    inArray: vi.fn(),
    isNotNull: vi.fn(),
    isNull: vi.fn(),
    lt: vi.fn(),
    max: vi.fn(),
    notInArray: vi.fn(),
    sum: vi.fn(),
  }
})

const ctx = {
  session: { companyId: "company-1", userId: "actor-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/crm/clients",
    nextUrl: { pathname: "/api/crm/clients", searchParams: new URLSearchParams() },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "leftJoin", "where", "orderBy", "groupBy", "limit"] as const)
    mockDb[m].mockReturnThis()
}

describe("GET /api/crm/clients — health score", () => {
  beforeEach(reset)

  it("computes a health band from value, engagement and recency", async () => {
    const CLIENT = "c1"
    queue.push([
      {
        id: CLIENT,
        name: "Popescu SRL",
        city: "Cluj",
        status: "active",
        createdAt: new Date("2025-01-01"),
      },
    ]) // clients
    queue.push([{ clientId: CLIENT, total: "30000" }]) // ltv (full value)
    queue.push([{ clientId: CLIENT, cnt: 2 }]) // active projects
    queue.push([{ clientId: CLIENT, cnt: 1 }]) // open quotes
    queue.push([{ clientId: CLIENT, cnt: 4, lastAt: new Date() }]) // activities (recent)

    const { GET } = await import("@/app/api/crm/clients/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.clients).toHaveLength(1)
    const c = body.clients[0]
    expect(c.health).toBeDefined()
    expect(c.health.score).toBeGreaterThan(75)
    expect(c.health.band).toBe("vip")
  })

  it("marks a stale, low-value customer as dormant/at-risk", async () => {
    const CLIENT = "c2"
    queue.push([
      {
        id: CLIENT,
        name: "Cold Co",
        city: null,
        status: "active",
        createdAt: new Date("2020-01-01"),
      },
    ])
    queue.push([]) // no ltv
    queue.push([]) // no projects
    queue.push([]) // no quotes
    queue.push([]) // no activities

    const { GET } = await import("@/app/api/crm/clients/route")
    const res = await GET(rq(), ctx)
    const body = await res.json()
    const c = body.clients[0]
    expect(c.health.score).toBe(0)
    expect(c.health.band).toBe("dormant")
  })
})
