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
  limit: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
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
  for (const t of ["projects", "projectAllocations", "users"]) mod[t] = col()
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
const PROJECT = "proj-1"
function getReq() {
  return {
    method: "GET",
    nextUrl: {
      pathname: `/api/projects/${PROJECT}/allocations`,
      searchParams: new URLSearchParams(),
    },
    url: `http://localhost/api/projects/${PROJECT}/allocations`,
    headers: { get: () => null },
  } as unknown as Request
}
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: {
      pathname: `/api/projects/${PROJECT}/allocations`,
      searchParams: new URLSearchParams(),
    },
    url: `http://localhost/api/projects/${PROJECT}/allocations`,
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
    "limit",
    "innerJoin",
    "insert",
    "values",
    "onConflictDoUpdate",
    "returning",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("/api/projects/[id]/allocations", () => {
  beforeEach(reset)

  it("GET annotates each allocation with the user's total utilization and over-allocation flag", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    queue.push([
      {
        id: "a1",
        userId: "u1",
        allocationPercentage: 80,
        roleLabel: "Supervisor",
        startDate: null,
        endDate: null,
        notes: null,
        firstName: "Maria",
        lastName: "Pop",
        jobTitle: "Site Supervisor",
        avatarUrl: null,
      },
    ]) // project allocations
    queue.push([
      { userId: "u1", allocationPercentage: 80 },
      { userId: "u1", allocationPercentage: 50 },
    ]) // company-wide active allocations → u1 total 130
    const { GET } = await import("@/app/api/projects/[id]/allocations/route")
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.allocations).toHaveLength(1)
    expect(body.allocations[0]).toMatchObject({
      userId: "u1",
      name: "Maria Pop",
      allocationPercentage: 80,
      userTotalPercentage: 130,
      overAllocated: true,
    })
  })

  it("GET returns 404 when the project is not in the caller's company", async () => {
    queue.push([]) // verifyProject → none
    const { GET } = await import("@/app/api/projects/[id]/allocations/route")
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(404)
  })

  it("POST upserts an allocation and audit-logs it", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    queue.push([{ id: "a-new" }]) // insert returning
    const { POST } = await import("@/app/api/projects/[id]/allocations/route")
    const res = await POST(
      postReq({ userId: "11111111-1111-1111-1111-111111111111", allocationPercentage: 25 }),
      ctx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe("a-new")
    expect(mockDb.onConflictDoUpdate).toHaveBeenCalledTimes(1)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST rejects an out-of-range percentage with 422", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    const { POST } = await import("@/app/api/projects/[id]/allocations/route")
    const res = await POST(
      postReq({ userId: "11111111-1111-1111-1111-111111111111", allocationPercentage: 150 }),
      ctx
    )
    expect(res.status).toBe(422)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })
})
