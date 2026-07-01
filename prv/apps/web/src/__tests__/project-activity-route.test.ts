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
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["projects", "projectActivity", "users"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), desc: vi.fn(), lt: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const PROJECT = "proj-1"
function getReq(qs = "") {
  return {
    method: "GET",
    nextUrl: {
      pathname: `/api/projects/${PROJECT}/activity`,
      searchParams: new URLSearchParams(qs),
    },
    url: `http://localhost/api/projects/${PROJECT}/activity`,
    headers: { get: () => null },
  } as unknown as Request
}
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: { pathname: `/api/projects/${PROJECT}/activity`, searchParams: new URLSearchParams() },
    url: `http://localhost/api/projects/${PROJECT}/activity`,
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
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("/api/projects/[id]/activity", () => {
  beforeEach(reset)

  it("GET returns the timeline with actor names and a null cursor on a short page", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    queue.push([
      {
        id: "a1",
        kind: "comment",
        summary: "Client approved layout",
        entityType: null,
        entityId: null,
        actorId: "u1",
        createdAt: new Date("2026-07-01T10:00:00Z"),
        firstName: "Elena",
        lastName: "Vasile",
      },
    ])
    const { GET } = await import("@/app/api/projects/[id]/activity/route")
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.entries).toHaveLength(1)
    expect(body.entries[0]).toMatchObject({ kind: "comment", actorName: "Elena Vasile" })
    expect(body.nextCursor).toBeNull()
  })

  it("POST records a comment on the timeline", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    queue.push([]) // writeProjectActivity insert
    const { POST } = await import("@/app/api/projects/[id]/activity/route")
    const res = await POST(postReq({ comment: "On track for Friday" }), ctx)
    expect(res.status).toBe(201)
    expect(mockDb.insert).toHaveBeenCalledTimes(1)
  })

  it("POST rejects an empty comment with 422", async () => {
    queue.push([{ id: PROJECT }]) // verifyProject
    const { POST } = await import("@/app/api/projects/[id]/activity/route")
    const res = await POST(postReq({ comment: "" }), ctx)
    expect(res.status).toBe(422)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("GET 404s when the project is not in the caller's company", async () => {
    queue.push([]) // verifyProject → none
    const { GET } = await import("@/app/api/projects/[id]/activity/route")
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(404)
  })
})
