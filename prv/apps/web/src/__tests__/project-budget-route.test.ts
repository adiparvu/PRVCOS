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
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["projects", "projectMilestones", "projectBudgetLines"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), isNull: vi.fn() }
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
    nextUrl: { pathname: `/api/projects/${PROJECT}/budget`, searchParams: new URLSearchParams() },
    url: `http://localhost/api/projects/${PROJECT}/budget`,
    headers: { get: () => null },
  } as unknown as Request
}
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: { pathname: `/api/projects/${PROJECT}/budget`, searchParams: new URLSearchParams() },
    url: `http://localhost/api/projects/${PROJECT}/budget`,
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
    "insert",
    "values",
    "onConflictDoUpdate",
    "returning",
    "delete",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("/api/projects/[id]/budget", () => {
  beforeEach(reset)

  it("GET aggregates category lines and runs EVA off milestone progress", async () => {
    queue.push([{ id: PROJECT, startDate: null, dueDate: null }]) // verifyProject
    queue.push([
      {
        category: "labor",
        plannedAmount: "60000",
        committedAmount: "6500",
        actualAmount: "30000",
        notes: null,
      },
      {
        category: "materials",
        plannedAmount: "40000",
        committedAmount: "0",
        actualAmount: "10000",
        notes: null,
      },
    ]) // budget lines → BAC 100000, actual 40000
    queue.push([{ isComplete: true }, { isComplete: false }]) // milestones → 50% complete
    const { GET } = await import("@/app/api/projects/[id]/budget/route")
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totals).toEqual({ planned: 100000, committed: 6500, actual: 40000 })
    expect(body.progress.percentComplete).toBe(0.5)
    expect(body.eva.bac).toBe(100000)
    expect(body.eva.ev).toBe(50000) // 100000 * 0.5
    expect(body.eva.cpi).toBe(1.25) // 50000 / 40000
    expect(body.lines).toHaveLength(2)
  })

  it("GET 404s when the project is not in the caller's company", async () => {
    queue.push([]) // verifyProject → none
    const { GET } = await import("@/app/api/projects/[id]/budget/route")
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(404)
  })

  it("POST upserts a category line and audit-logs it", async () => {
    queue.push([{ id: PROJECT, startDate: null, dueDate: null }]) // verifyProject
    queue.push([{ id: "line-1" }]) // insert returning
    const { POST } = await import("@/app/api/projects/[id]/budget/route")
    const res = await POST(
      postReq({ category: "labor", plannedAmount: 28000, actualAmount: 24500 }),
      ctx
    )
    expect(res.status).toBe(201)
    expect(mockDb.onConflictDoUpdate).toHaveBeenCalledTimes(1)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST rejects an unknown category with 422", async () => {
    queue.push([{ id: PROJECT, startDate: null, dueDate: null }]) // verifyProject
    const { POST } = await import("@/app/api/projects/[id]/budget/route")
    const res = await POST(postReq({ category: "marketing", plannedAmount: 100 }), ctx)
    expect(res.status).toBe(422)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })
})
