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
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
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
  for (const t of ["employmentContracts", "users"]) mod[t] = col()
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
const USER = "11111111-1111-1111-1111-111111111111"
function getReq(qs = "") {
  return {
    method: "GET",
    nextUrl: { pathname: "/api/contracts", searchParams: new URLSearchParams(qs) },
    url: `http://localhost/api/contracts?${qs}`,
    headers: { get: () => null },
  } as unknown as Request
}
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: { pathname: "/api/contracts", searchParams: new URLSearchParams() },
    url: "http://localhost/api/contracts",
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request
}
function patchReq(rowId: string, body: unknown) {
  return {
    method: "PATCH",
    nextUrl: { pathname: `/api/contracts/${rowId}`, searchParams: new URLSearchParams() },
    url: `http://localhost/api/contracts/${rowId}`,
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
    "insert",
    "values",
    "returning",
    "update",
    "set",
    "delete",
  ] as const)
    mockDb[m].mockReturnThis()
}

const base = {
  salaryAmount: "3000",
  salaryCurrency: "RON",
  payPeriod: "monthly",
  version: 1,
  signedAt: null,
  firstName: "Radu",
  lastName: "Pop",
}

describe("/api/contracts", () => {
  beforeEach(reset)

  it("GET annotates expiry, flags expired, and summarizes", async () => {
    queue.push([
      {
        id: "c1",
        userId: USER,
        type: "fixed_term",
        status: "active",
        roleTitle: "Carpenter",
        startDate: "2019-01-01",
        endDate: "2020-01-01",
        ...base,
      }, // expired
      {
        id: "c2",
        userId: USER,
        type: "permanent",
        status: "active",
        roleTitle: "PM",
        startDate: "2022-01-01",
        endDate: null,
        ...base,
      }, // no alert
    ])
    const { GET } = await import("@/app/api/contracts/route")
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    const byId = Object.fromEntries(body.contracts.map((c: { id: string }) => [c.id, c]))
    expect(byId.c1.alert).toBe("expired")
    expect(byId.c2.alert).toBeNull()
    expect(body.meta).toMatchObject({ total: 2, active: 2, expired: 1 })
    // Expired sorts to the front.
    expect(body.contracts[0].id).toBe("c1")
  })

  it("POST issues a contract and audit-logs it", async () => {
    queue.push([{ id: "c-new" }])
    const { POST } = await import("@/app/api/contracts/route")
    const res = await POST(
      postReq({ userId: USER, roleTitle: "Carpenter", startDate: "2026-07-01" }),
      ctx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.version).toBe(1)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST with supersedesId marks the prior superseded and bumps the version", async () => {
    queue.push([{ version: 2 }]) // update prior returning
    queue.push([{ id: "c-v3" }]) // insert returning
    const { POST } = await import("@/app/api/contracts/route")
    const res = await POST(
      postReq({
        userId: USER,
        roleTitle: "Carpenter",
        startDate: "2026-07-01",
        supersedesId: "22222222-2222-2222-2222-222222222222",
      }),
      ctx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.version).toBe(3)
    expect(mockDb.update).toHaveBeenCalledTimes(1)
  })

  it("POST rejects a bad start date with 422", async () => {
    const { POST } = await import("@/app/api/contracts/route")
    const res = await POST(postReq({ userId: USER, roleTitle: "X", startDate: "01-07-2026" }), ctx)
    expect(res.status).toBe(422)
  })

  it("PATCH terminate transitions the contract and 404s when missing", async () => {
    queue.push([{ id: "c1", status: "terminated" }])
    const { PATCH } = await import("@/app/api/contracts/[id]/route")
    const ok = await PATCH(patchReq("c1", { action: "terminate", terminationReason: "Ended" }), ctx)
    expect(ok.status).toBe(200)
    expect((await ok.json()).status).toBe("terminated")

    reset()
    queue.push([])
    const { PATCH: PATCH2 } = await import("@/app/api/contracts/[id]/route")
    const miss = await PATCH2(patchReq("nope", { action: "sign" }), ctx)
    expect(miss.status).toBe(404)
  })
})
