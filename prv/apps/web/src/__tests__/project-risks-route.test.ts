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
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["projects", "projectRisks", "users"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), desc: vi.fn() }
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
    nextUrl: { pathname: `/api/projects/${PROJECT}/risks`, searchParams: new URLSearchParams() },
    url: `http://localhost/api/projects/${PROJECT}/risks`,
    headers: { get: () => null },
  } as unknown as Request
}
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: { pathname: `/api/projects/${PROJECT}/risks`, searchParams: new URLSearchParams() },
    url: `http://localhost/api/projects/${PROJECT}/risks`,
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
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("/api/projects/[id]/risks", () => {
  beforeEach(reset)

  it("GET computes severity, sorts by score, and summarizes bands", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    queue.push([
      {
        id: "r1",
        title: "Minor variance",
        description: null,
        category: "quality",
        impact: 3,
        probability: 1,
        mitigation: null,
        status: "accepted",
        ownerId: null,
        dueDate: null,
        firstName: null,
        lastName: null,
      },
      {
        id: "r2",
        title: "Stone delivery slip",
        description: null,
        category: "schedule",
        impact: 5,
        probability: 4,
        mitigation: "Order early",
        status: "mitigating",
        ownerId: "u1",
        dueDate: null,
        firstName: "Elena",
        lastName: "Vasile",
      },
    ])
    const { GET } = await import("@/app/api/projects/[id]/risks/route")
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    // Sorted by severity: r2 (20) before r1 (3)
    expect(body.risks[0]).toMatchObject({
      id: "r2",
      score: 20,
      band: "critical",
      ownerName: "Elena Vasile",
    })
    expect(body.risks[1]).toMatchObject({ id: "r1", score: 3, band: "low" })
    expect(body.meta.total).toBe(2)
    expect(body.meta.open).toBe(1) // r2 mitigating counts as open; r1 accepted does not
    expect(body.meta.byBand.critical).toBe(1)
    expect(body.meta.topScore).toBe(20)
  })

  it("POST logs a risk and audit-logs it", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    queue.push([{ id: "new-risk" }]) // insert returning
    const { POST } = await import("@/app/api/projects/[id]/risks/route")
    const res = await POST(postReq({ title: "Asbestos discovery", impact: 5, probability: 3 }), ctx)
    expect(res.status).toBe(201)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST rejects an out-of-range impact with 422", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    const { POST } = await import("@/app/api/projects/[id]/risks/route")
    const res = await POST(postReq({ title: "Bad", impact: 9, probability: 2 }), ctx)
    expect(res.status).toBe(422)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })
})
