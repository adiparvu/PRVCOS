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
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["projectAllocations", "projects", "users"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), isNull: vi.fn(), or: vi.fn(), gte: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function req() {
  return {
    method: "GET",
    nextUrl: { pathname: "/api/resources/workload", searchParams: new URLSearchParams() },
    url: "http://localhost/api/resources/workload",
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  mockDb.select.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.innerJoin.mockReturnThis()
  mockDb.where.mockReturnThis()
}

const person = (
  userId: string,
  first: string,
  projectId: string,
  projectName: string,
  pct: number
) => ({
  userId,
  allocationPercentage: pct,
  roleLabel: null,
  projectId,
  projectName,
  firstName: first,
  lastName: "Test",
  jobTitle: "Worker",
  avatarUrl: null,
})

describe("GET /api/resources/workload", () => {
  beforeEach(reset)

  it("returns empty people + zeroed summary when there are no allocations", async () => {
    const { GET } = await import("@/app/api/resources/workload/route")
    const res = await GET(req(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.people).toEqual([])
    expect(body.summary).toEqual({
      people: 0,
      overAllocated: 0,
      underUtilized: 0,
      averageUtilization: 0,
    })
  })

  it("aggregates per user, bands utilization, and computes the summary", async () => {
    queue.push([
      // Maria: 80 + 50 = 130 → over
      person("u1", "Maria", "p1", "Kitchen Reno", 80),
      person("u1", "Maria", "p2", "Bathroom Refit", 50),
      // Radu: 40 → under
      person("u2", "Radu", "p1", "Kitchen Reno", 40),
    ])
    const { GET } = await import("@/app/api/resources/workload/route")
    const res = await GET(req(), ctx)
    const body = await res.json()

    expect(body.people).toHaveLength(2)
    // Most-loaded first
    expect(body.people[0]).toMatchObject({ userId: "u1", totalPercentage: 130, band: "over" })
    expect(body.people[0].projects).toHaveLength(2)
    expect(body.people[1]).toMatchObject({ userId: "u2", totalPercentage: 40, band: "under" })

    expect(body.summary).toEqual({
      people: 2,
      overAllocated: 1,
      underUtilized: 1,
      averageUtilization: 85, // (130 + 40) / 2
    })
  })

  it("bands exactly 100% as full and 90% as optimal", async () => {
    queue.push([person("u1", "Ana", "p1", "Alpha", 100), person("u2", "Bogdan", "p1", "Alpha", 90)])
    const { GET } = await import("@/app/api/resources/workload/route")
    const res = await GET(req(), ctx)
    const body = await res.json()
    const bands = Object.fromEntries(
      body.people.map((p: { userId: string; band: string }) => [p.userId, p.band])
    )
    expect(bands.u1).toBe("full")
    expect(bands.u2).toBe("optimal")
  })
})
