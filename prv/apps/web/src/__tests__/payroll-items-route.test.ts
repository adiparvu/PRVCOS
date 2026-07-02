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
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["payrollRuns", "payrollItems", "users"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "actor-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const RUN = "run-1"
const USER = "11111111-1111-1111-1111-111111111111"
function getReq() {
  return {
    method: "GET",
    nextUrl: { pathname: `/api/payroll/${RUN}/items`, searchParams: new URLSearchParams() },
    url: `http://localhost/api/payroll/${RUN}/items`,
    headers: { get: () => null },
  } as unknown as Request
}
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: { pathname: `/api/payroll/${RUN}/items`, searchParams: new URLSearchParams() },
    url: `http://localhost/api/payroll/${RUN}/items`,
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request
}
function patchReq(itemId: string, body: unknown) {
  return {
    method: "PATCH",
    nextUrl: {
      pathname: `/api/payroll/${RUN}/items/${itemId}`,
      searchParams: new URLSearchParams(),
    },
    url: `http://localhost/api/payroll/${RUN}/items/${itemId}`,
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
    "limit",
    "insert",
    "values",
    "onConflictDoUpdate",
    "returning",
    "update",
    "set",
    "delete",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("/api/payroll/[id]/items", () => {
  beforeEach(reset)

  it("GET returns lines sorted by net with a totals summary", async () => {
    queue.push([{ id: RUN }]) // verifyRun
    queue.push([
      {
        id: "i1",
        userId: "u1",
        baseAmount: "2000",
        overtimeHours: "0",
        overtimeAmount: "0",
        bonusAmount: "0",
        allowanceAmount: "0",
        deductionAmount: "500",
        grossAmount: "2000",
        netAmount: "1500",
        currency: "RON",
        firstName: "A",
        lastName: "One",
        jobTitle: null,
      },
      {
        id: "i2",
        userId: "u2",
        baseAmount: "3000",
        overtimeHours: "5",
        overtimeAmount: "300",
        bonusAmount: "0",
        allowanceAmount: "0",
        deductionAmount: "800",
        grossAmount: "3300",
        netAmount: "2500",
        currency: "RON",
        firstName: "B",
        lastName: "Two",
        jobTitle: null,
      },
    ])
    const { GET } = await import("@/app/api/payroll/[id]/items/route")
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items[0].id).toBe("i2") // higher net first
    expect(body.totals).toMatchObject({
      employeeCount: 2,
      totalGross: 5300,
      totalDeduction: 1300,
      totalNet: 4000,
    })
  })

  it("POST upserts a line with computed gross/net and recomputes the run", async () => {
    queue.push([{ id: RUN }]) // verifyRun
    queue.push([{ id: "i-new" }]) // insert returning
    queue.push([{ grossAmount: "3500", netAmount: "2700" }]) // recompute select
    queue.push([]) // recompute update
    const { POST } = await import("@/app/api/payroll/[id]/items/route")
    const res = await POST(
      postReq({ userId: USER, baseAmount: 3000, overtimeAmount: 500, deductionAmount: 800 }),
      ctx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toMatchObject({ gross: 3500, net: 2700 })
    expect(mockDb.update).toHaveBeenCalledTimes(1) // run recompute
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST 404s when the run is not in the company", async () => {
    queue.push([]) // verifyRun → none
    const { POST } = await import("@/app/api/payroll/[id]/items/route")
    const res = await POST(postReq({ userId: USER, baseAmount: 1000 }), ctx)
    expect(res.status).toBe(404)
  })

  it("PATCH merges amounts, recomputes the line, and 404s when missing", async () => {
    queue.push([
      {
        baseAmount: "3000",
        overtimeAmount: "0",
        bonusAmount: "0",
        allowanceAmount: "0",
        deductionAmount: "0",
      },
    ]) // current
    queue.push([]) // update item
    queue.push([]) // recompute select
    queue.push([]) // recompute update
    const { PATCH } = await import("@/app/api/payroll/[id]/items/[itemId]/route")
    const ok = await PATCH(patchReq("i1", { bonusAmount: 200 }), ctx)
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ gross: 3200, net: 3200 })

    reset()
    queue.push([]) // current → none
    const { PATCH: P2 } = await import("@/app/api/payroll/[id]/items/[itemId]/route")
    const miss = await P2(patchReq("nope", { bonusAmount: 1 }), ctx)
    expect(miss.status).toBe(404)
  })
})
