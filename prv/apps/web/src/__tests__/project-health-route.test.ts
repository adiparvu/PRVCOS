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
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  catch: vi.fn(() => Promise.resolve()),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["projects", "projectTasks", "projectRisks", "projectBudgetLines"]) mod[t] = col()
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
function req() {
  return {
    method: "GET",
    nextUrl: { pathname: `/api/projects/${PROJECT}/health`, searchParams: new URLSearchParams() },
    url: `http://localhost/api/projects/${PROJECT}/health`,
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "where", "limit", "update", "set"] as const)
    mockDb[m].mockReturnThis()
  mockDb.catch.mockImplementation(() => Promise.resolve())
}

describe("GET /api/projects/[id]/health", () => {
  beforeEach(reset)

  it("computes the composite health score from tasks, risks and budget", async () => {
    queue.push([{ id: PROJECT, startDate: null, dueDate: null }]) // project
    queue.push([
      { status: "done" },
      { status: "done" },
      { status: "todo" },
      { status: "in_progress" },
    ]) // tasks: 2/4
    queue.push([{ impact: 5, probability: 3, status: "open" }]) // one critical open risk
    queue.push([{ plannedAmount: "100", actualAmount: "50" }]) // budget ratio 0.5 → green
    const { GET } = await import("@/app/api/projects/[id]/health/route")
    const res = await GET(req(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.score).toBe(91)
    expect(body.band).toBe("healthy")
    expect(body.inputs).toMatchObject({
      totalTasks: 4,
      doneTasks: 2,
      budgetBand: "green",
      openCriticalRisks: 1,
    })
  })

  it("404s when the project is not in the caller's company", async () => {
    queue.push([]) // project → none
    const { GET } = await import("@/app/api/projects/[id]/health/route")
    const res = await GET(req(), ctx)
    expect(res.status).toBe(404)
  })
})
