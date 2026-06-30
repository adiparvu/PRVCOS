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
  orderBy: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn(() => Promise.resolve(nextResult())),
  limit: vi.fn(() => Promise.resolve(nextResult())),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const tables = ["companyGroups", "groupMemberships", "companies"]
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
    asc: vi.fn(),
    isNull: vi.fn(),
    notInArray: vi.fn(),
  }
})

function ctxOf(scopeLevel: string) {
  return {
    session: { companyId: "company-1", userId: "user-1", sessionId: "session-1", scopeLevel },
    ipAddress: "127.0.0.1",
    userAgent: "test",
  }
}

function getReq() {
  return {
    method: "GET",
    nextUrl: { pathname: "/api/groups/g1", searchParams: new URLSearchParams() },
    url: "http://localhost/api/groups/g1",
    headers: { get: () => null },
  } as unknown as Request
}

function patchReq(body: unknown) {
  return {
    method: "PATCH",
    nextUrl: { pathname: "/api/groups/g1", searchParams: new URLSearchParams() },
    url: "http://localhost/api/groups/g1",
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Request
}

function reset() {
  vi.clearAllMocks()
  queue.length = 0
  mockDb.select.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.innerJoin.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.update.mockReturnThis()
  mockDb.set.mockReturnThis()
  mockDb.returning.mockImplementation(() => Promise.resolve(nextResult()))
  mockDb.limit.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/groups/[groupId]", () => {
  beforeEach(reset)

  it("returns the group with members + eligible companies", async () => {
    queue.push(
      [], // membership (platform admin passes)
      [
        {
          id: "g1",
          name: "PRV Group",
          slug: "prv-group",
          description: null,
          logoUrl: null,
          createdAt: "2026-01-01",
        },
      ], // group
      [], // memberRows
      [{ id: "c2", name: "PRV Logistics" }] // eligibleCompanies
    )
    const { GET } = await import("@/app/api/groups/[groupId]/route")
    const res = await GET(getReq(), ctxOf("SCOPE_PLATFORM"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.group.name).toBe("PRV Group")
    expect(body.eligibleCompanies).toEqual([{ id: "c2", name: "PRV Logistics" }])
    expect(body.kpis).toBeDefined()
  })
})

describe("PATCH /api/groups/[groupId]", () => {
  beforeEach(reset)

  it("returns 404 when caller is neither member nor platform admin", async () => {
    queue.push([]) // membership empty
    const { PATCH } = await import("@/app/api/groups/[groupId]/route")
    const res = await PATCH(patchReq({ name: "New" }), ctxOf("SCOPE_COMPANY"))
    expect(res.status).toBe(404)
  })

  it("returns 422 when neither name nor description is provided", async () => {
    queue.push([]) // membership (platform admin passes)
    const { PATCH } = await import("@/app/api/groups/[groupId]/route")
    const res = await PATCH(patchReq({}), ctxOf("SCOPE_PLATFORM"))
    expect(res.status).toBe(422)
  })

  it("renames the group and returns the updated record", async () => {
    queue.push(
      [], // membership (platform admin passes)
      [{ id: "g1", name: "PRV Holding", description: "Top group" }] // update returning
    )
    const { PATCH } = await import("@/app/api/groups/[groupId]/route")
    const res = await PATCH(patchReq({ name: "PRV Holding" }), ctxOf("SCOPE_PLATFORM"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.group.name).toBe("PRV Holding")
    expect(mockDb.update).toHaveBeenCalledTimes(1)
  })
})
