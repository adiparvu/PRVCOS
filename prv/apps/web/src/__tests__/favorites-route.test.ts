import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
const auditSpy = vi.fn().mockResolvedValue(undefined)
vi.mock("@prv/auth", () => ({
  writeAuditLog: auditSpy,
  RoleSets: { admin: [] },
}))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["userFavorites"]) mod[t] = col()
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
function getReq(qs = "") {
  return {
    method: "GET",
    nextUrl: { pathname: "/api/favorites", searchParams: new URLSearchParams(qs) },
    url: `http://localhost/api/favorites?${qs}`,
    headers: { get: () => null },
  } as unknown as Request
}
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: { pathname: "/api/favorites", searchParams: new URLSearchParams() },
    url: "http://localhost/api/favorites",
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request
}
function delReq(qs = "") {
  return {
    method: "DELETE",
    nextUrl: { pathname: "/api/favorites", searchParams: new URLSearchParams(qs) },
    url: `http://localhost/api/favorites?${qs}`,
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
    "orderBy",
    "limit",
    "insert",
    "values",
    "returning",
    "delete",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("/api/favorites", () => {
  beforeEach(reset)

  it("GET returns the user's favorites newest-first", async () => {
    queue.push([
      {
        id: "f1",
        entityType: "project",
        entityId: "p1",
        label: "Kitchen Reno",
        href: "/projects/p1",
        createdAt: new Date("2026-07-01T09:00:00Z"),
      },
    ])
    const { GET } = await import("@/app/api/favorites/route")
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.favorites).toHaveLength(1)
    expect(body.favorites[0]).toMatchObject({
      id: "f1",
      entityType: "project",
      href: "/projects/p1",
    })
    expect(typeof body.favorites[0].createdAt).toBe("string")
  })

  it("POST creates a favorite when none exists and audit-logs it", async () => {
    queue.push([]) // existing check → none
    queue.push([{ id: "new-fav" }]) // insert returning
    const { POST } = await import("@/app/api/favorites/route")
    const res = await POST(
      postReq({
        entityType: "product",
        entityId: "sku-9",
        label: "Drill",
        href: "/commerce/sku-9",
      }),
      ctx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.favorite).toEqual({ id: "new-fav", alreadyFavorited: false })
    expect(auditSpy).toHaveBeenCalledTimes(1)
    expect(mockDb.insert).toHaveBeenCalledTimes(1)
  })

  it("POST is idempotent — returns the existing row without inserting", async () => {
    queue.push([{ id: "already" }]) // existing check → found
    const { POST } = await import("@/app/api/favorites/route")
    const res = await POST(
      postReq({
        entityType: "product",
        entityId: "sku-9",
        label: "Drill",
        href: "/commerce/sku-9",
      }),
      ctx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.favorite).toEqual({ id: "already", alreadyFavorited: true })
    expect(mockDb.insert).not.toHaveBeenCalled()
    expect(auditSpy).not.toHaveBeenCalled()
  })

  it("POST rejects an invalid payload with 422", async () => {
    const { POST } = await import("@/app/api/favorites/route")
    const res = await POST(postReq({ entityType: "product" }), ctx)
    expect(res.status).toBe(422)
  })

  it("DELETE removes the caller's favorite and reports the count", async () => {
    queue.push([{ id: "del-1" }]) // delete returning
    const { DELETE } = await import("@/app/api/favorites/route")
    const res = await DELETE(delReq("entityType=product&entityId=sku-9"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.removed).toBe(1)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("DELETE without params returns 400", async () => {
    const { DELETE } = await import("@/app/api/favorites/route")
    const res = await DELETE(delReq(""), ctx)
    expect(res.status).toBe(400)
  })
})
