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
  return { publicHolidays: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function getReq(qs = "") {
  return {
    method: "GET",
    nextUrl: { pathname: "/api/workforce/holidays", searchParams: new URLSearchParams(qs) },
    url: `http://localhost/api/workforce/holidays?${qs}`,
    headers: { get: () => null },
  } as unknown as Request
}
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: { pathname: "/api/workforce/holidays", searchParams: new URLSearchParams() },
    url: "http://localhost/api/workforce/holidays",
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request
}
function delReq(id: string) {
  return {
    method: "DELETE",
    nextUrl: { pathname: `/api/workforce/holidays/${id}`, searchParams: new URLSearchParams() },
    url: `http://localhost/api/workforce/holidays/${id}`,
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
    "insert",
    "values",
    "onConflictDoUpdate",
    "returning",
    "delete",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("/api/workforce/holidays", () => {
  beforeEach(reset)

  it("GET expands recurring holidays to the year and drops off-year one-offs", async () => {
    queue.push([
      {
        id: "h1",
        name: "New Year's Day",
        date: "2020-01-01",
        country: "RO",
        region: null,
        isRecurring: true,
      },
      {
        id: "h2",
        name: "Foundation Day",
        date: "2026-05-18",
        country: "RO",
        region: null,
        isRecurring: false,
      },
      {
        id: "h3",
        name: "Old one-off",
        date: "2024-03-03",
        country: "RO",
        region: null,
        isRecurring: false,
      },
    ])
    const { GET } = await import("@/app/api/workforce/holidays/route")
    const res = await GET(getReq("year=2026"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(2)
    expect(body.holidays.map((h: { date: string }) => h.date)).toEqual(["2026-01-01", "2026-05-18"])
  })

  it("POST adds a holiday and audit-logs it", async () => {
    queue.push([{ id: "h-new" }])
    const { POST } = await import("@/app/api/workforce/holidays/route")
    const res = await POST(postReq({ name: "Labour Day", date: "2026-05-01" }), ctx)
    expect(res.status).toBe(201)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST rejects a malformed date with 422", async () => {
    const { POST } = await import("@/app/api/workforce/holidays/route")
    const res = await POST(postReq({ name: "Bad", date: "05-01-2026" }), ctx)
    expect(res.status).toBe(422)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("DELETE removes a holiday", async () => {
    queue.push([{ id: "h1" }])
    const { DELETE } = await import("@/app/api/workforce/holidays/[id]/route")
    const res = await DELETE(delReq("h1"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.removed).toBe(1)
  })

  it("DELETE 404s for an unknown holiday", async () => {
    queue.push([])
    const { DELETE } = await import("@/app/api/workforce/holidays/[id]/route")
    const res = await DELETE(delReq("nope"), ctx)
    expect(res.status).toBe(404)
  })
})
