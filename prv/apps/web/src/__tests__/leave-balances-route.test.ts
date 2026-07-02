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
  for (const t of ["leaveBalances", "users"]) mod[t] = col()
  return mod
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
    nextUrl: { pathname: "/api/workforce/leave/balances", searchParams: new URLSearchParams(qs) },
    url: `http://localhost/api/workforce/leave/balances?${qs}`,
    headers: { get: () => null },
  } as unknown as Request
}
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: { pathname: "/api/workforce/leave/balances", searchParams: new URLSearchParams() },
    url: "http://localhost/api/workforce/leave/balances",
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
    "insert",
    "values",
    "onConflictDoUpdate",
    "returning",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("/api/workforce/leave/balances", () => {
  beforeEach(reset)

  it("GET returns balances with computed available", async () => {
    queue.push([
      {
        id: "b1",
        userId: "u1",
        type: "annual",
        year: 2026,
        entitlementDays: "21",
        carriedOverDays: "5",
        accrualDaysPerMonth: null,
        usedDays: "11.5",
        pendingDays: "2.5",
        firstName: "Elena",
        lastName: "Vasile",
      },
    ])
    const { GET } = await import("@/app/api/workforce/leave/balances/route")
    const res = await GET(getReq("userId=u1&year=2026"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.year).toBe(2026)
    expect(body.balances[0]).toMatchObject({
      type: "annual",
      userName: "Elena Vasile",
      entitlementTotal: 26,
      available: 12,
    })
  })

  it("POST upserts a balance and audit-logs it", async () => {
    queue.push([{ id: "b-new" }])
    const { POST } = await import("@/app/api/workforce/leave/balances/route")
    const res = await POST(
      postReq({
        userId: "11111111-1111-1111-1111-111111111111",
        type: "annual",
        year: 2026,
        entitlementDays: 21,
      }),
      ctx
    )
    expect(res.status).toBe(201)
    expect(mockDb.onConflictDoUpdate).toHaveBeenCalledTimes(1)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST rejects an out-of-range entitlement with 422", async () => {
    const { POST } = await import("@/app/api/workforce/leave/balances/route")
    const res = await POST(
      postReq({
        userId: "11111111-1111-1111-1111-111111111111",
        type: "annual",
        year: 2026,
        entitlementDays: 9999,
      }),
      ctx
    )
    expect(res.status).toBe(422)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })
})
