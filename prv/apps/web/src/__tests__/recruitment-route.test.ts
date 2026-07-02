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
  returning: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["jobRequisitions", "candidates", "departments", "users"]) mod[t] = col()
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
const REQ = "22222222-2222-2222-2222-222222222222"
function req(url: string, method = "GET", body?: unknown) {
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
    "returning",
    "update",
    "set",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("recruitment routes", () => {
  beforeEach(reset)

  it("GET requisitions rolls up candidate counts and meta", async () => {
    queue.push([
      {
        id: "r1",
        title: "Electrician",
        employmentType: "permanent",
        headcount: 2,
        status: "open",
        location: "Bucharest",
        departmentName: "Ops",
        managerFirst: "Elena",
        managerLast: "V",
      },
    ])
    queue.push([
      { requisitionId: "r1", stage: "sourcing" },
      { requisitionId: "r1", stage: "hired" },
      { requisitionId: "r1", stage: "rejected" },
    ])
    const { GET } = await import("@/app/api/recruitment/requisitions/route")
    const res = await GET(req("/api/recruitment/requisitions"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.requisitions[0]).toMatchObject({
      id: "r1",
      candidateCount: 3,
      activeCount: 1,
      hiredCount: 1,
      hiringManagerName: "Elena V",
    })
    expect(body.meta).toMatchObject({ open: 1, openHeadcount: 2, candidatesInPipeline: 1 })
  })

  it("POST requisition creates + audit-logs, rejects blank title", async () => {
    queue.push([{ id: "r-new" }])
    const { POST } = await import("@/app/api/recruitment/requisitions/route")
    const ok = await POST(
      req("/api/recruitment/requisitions", "POST", { title: "Carpenter", headcount: 1 }),
      ctx
    )
    expect(ok.status).toBe(201)
    expect(auditSpy).toHaveBeenCalledTimes(1)

    reset()
    const { POST: P2 } = await import("@/app/api/recruitment/requisitions/route")
    const bad = await P2(req("/api/recruitment/requisitions", "POST", { title: "" }), ctx)
    expect(bad.status).toBe(422)
  })

  it("candidates GET requires requisitionId and lists the pipeline", async () => {
    const { GET } = await import("@/app/api/recruitment/candidates/route")
    const missing = await GET(req("/api/recruitment/candidates"), ctx)
    expect(missing.status).toBe(400)

    reset()
    queue.push([
      {
        id: "c1",
        requisitionId: REQ,
        fullName: "Ana",
        email: null,
        source: "eJobs",
        stage: "interview",
        rating: 4,
        orderIndex: 0,
      },
    ])
    const { GET: G2 } = await import("@/app/api/recruitment/candidates/route")
    const res = await G2(req(`/api/recruitment/candidates?requisitionId=${REQ}`), ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).candidates[0].fullName).toBe("Ana")
  })

  it("candidates POST verifies the requisition then inserts", async () => {
    queue.push([{ id: REQ }]) // verifyRequisition
    queue.push([{ id: "c-new" }]) // insert returning
    const { POST } = await import("@/app/api/recruitment/candidates/route")
    const res = await POST(
      req("/api/recruitment/candidates", "POST", { requisitionId: REQ, fullName: "Vlad" }),
      ctx
    )
    expect(res.status).toBe(201)
    expect(auditSpy).toHaveBeenCalledTimes(1)

    reset()
    queue.push([]) // verifyRequisition → none
    const { POST: P2 } = await import("@/app/api/recruitment/candidates/route")
    const nf = await P2(
      req("/api/recruitment/candidates", "POST", { requisitionId: REQ, fullName: "X" }),
      ctx
    )
    expect(nf.status).toBe(404)
  })

  it("candidate PATCH moves the stage and 404s when missing", async () => {
    queue.push([{ id: "c1", stage: "offer" }])
    const { PATCH } = await import("@/app/api/recruitment/candidates/[id]/route")
    const ok = await PATCH(req("/api/recruitment/candidates/c1", "PATCH", { stage: "offer" }), ctx)
    expect(ok.status).toBe(200)
    expect((await ok.json()).stage).toBe("offer")

    reset()
    queue.push([])
    const { PATCH: P2 } = await import("@/app/api/recruitment/candidates/[id]/route")
    const miss = await P2(req("/api/recruitment/candidates/nope", "PATCH", { stage: "hired" }), ctx)
    expect(miss.status).toBe(404)
  })
})
