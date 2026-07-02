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
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["reviewCycles", "reviews", "users"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), desc: vi.fn(), asc: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "actor-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const CYCLE = "22222222-2222-2222-2222-222222222222"
const USER = "11111111-1111-1111-1111-111111111111"
function rq(url: string, method = "GET", body?: unknown) {
  const u = new URL(`http://localhost${url}`)
  return {
    method,
    nextUrl: { pathname: u.pathname, searchParams: u.searchParams },
    url: u.toString(),
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
    "leftJoin",
    "where",
    "orderBy",
    "limit",
    "insert",
    "values",
    "onConflictDoNothing",
    "returning",
    "update",
    "set",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("reviews routes", () => {
  beforeEach(reset)

  it("GET cycles rolls up workflow progress", async () => {
    queue.push([
      {
        id: "cy1",
        name: "2026 Annual",
        cadence: "annual",
        status: "active",
        periodStart: null,
        periodEnd: null,
        dueDate: null,
      },
    ])
    queue.push([
      { cycleId: "cy1", stage: "signed_off" },
      { cycleId: "cy1", stage: "self_review" },
    ])
    const { GET } = await import("@/app/api/reviews/cycles/route")
    const res = await GET(rq("/api/reviews/cycles"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cycles[0].progress).toMatchObject({ total: 2, signedOff: 1, percent: 50 })
  })

  it("POST cycle creates + audit-logs, rejects blank name", async () => {
    queue.push([{ id: "cy-new" }])
    const { POST } = await import("@/app/api/reviews/cycles/route")
    const ok = await POST(
      rq("/api/reviews/cycles", "POST", { name: "Q2", cadence: "quarterly" }),
      ctx
    )
    expect(ok.status).toBe(201)
    expect(auditSpy).toHaveBeenCalledTimes(1)

    reset()
    const { POST: P2 } = await import("@/app/api/reviews/cycles/route")
    expect((await P2(rq("/api/reviews/cycles", "POST", { name: "" }), ctx)).status).toBe(422)
  })

  it("reviews GET needs cycleId; POST verifies the cycle", async () => {
    const { GET } = await import("@/app/api/reviews/route")
    expect((await GET(rq("/api/reviews"), ctx)).status).toBe(400)

    reset()
    queue.push([{ id: CYCLE }]) // verifyCycle
    queue.push([{ id: "rev-new" }]) // insert returning
    const { POST } = await import("@/app/api/reviews/route")
    const ok = await POST(rq("/api/reviews", "POST", { cycleId: CYCLE, userId: USER }), ctx)
    expect(ok.status).toBe(201)

    reset()
    queue.push([]) // verifyCycle → none
    const { POST: P2 } = await import("@/app/api/reviews/route")
    expect(
      (await P2(rq("/api/reviews", "POST", { cycleId: CYCLE, userId: USER }), ctx)).status
    ).toBe(404)
  })

  it("PATCH advances the stage and 409s once signed off", async () => {
    queue.push([{ id: "r1", stage: "self_review" }]) // current
    queue.push([{ id: "r1", stage: "manager_review" }]) // update returning
    const { PATCH } = await import("@/app/api/reviews/[id]/route")
    const ok = await PATCH(rq("/api/reviews/r1", "PATCH", { action: "advance", rating: 4 }), ctx)
    expect(ok.status).toBe(200)
    expect((await ok.json()).stage).toBe("manager_review")

    reset()
    queue.push([{ id: "r1", stage: "signed_off" }]) // already complete
    const { PATCH: P2 } = await import("@/app/api/reviews/[id]/route")
    const done = await P2(rq("/api/reviews/r1", "PATCH", { action: "advance" }), ctx)
    expect(done.status).toBe(409)
    expect((await done.json()).code).toBe("REVIEW_COMPLETE")
  })
})
