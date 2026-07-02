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
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["employeeDocuments", "users"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), asc: vi.fn() }
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
    nextUrl: { pathname: "/api/compliance/documents", searchParams: new URLSearchParams(qs) },
    url: `http://localhost/api/compliance/documents?${qs}`,
    headers: { get: () => null },
  } as unknown as Request
}
function postReq(body: unknown) {
  return {
    method: "POST",
    nextUrl: { pathname: "/api/compliance/documents", searchParams: new URLSearchParams() },
    url: "http://localhost/api/compliance/documents",
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request
}
function patchReq(rowId: string, body: unknown) {
  return {
    method: "PATCH",
    nextUrl: {
      pathname: `/api/compliance/documents/${rowId}`,
      searchParams: new URLSearchParams(),
    },
    url: `http://localhost/api/compliance/documents/${rowId}`,
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
  ] as const)
    mockDb[m].mockReturnThis()
}

const base = { reference: null, issuedDate: null, notes: null, firstName: "Ana", lastName: "Pop" }

describe("/api/compliance/documents", () => {
  beforeEach(reset)

  it("GET bands documents, computes compliance %, and sorts worst first", async () => {
    queue.push([
      {
        id: "d1",
        userId: USER,
        docType: "passport",
        title: "Passport",
        expiryDate: "2099-01-01",
        status: "verified",
        ...base,
      }, // valid+compliant
      {
        id: "d2",
        userId: USER,
        docType: "visa",
        title: "Visa",
        expiryDate: "2020-01-01",
        status: "verified",
        ...base,
      }, // expired
      {
        id: "d3",
        userId: USER,
        docType: "certification",
        title: "Cert",
        expiryDate: null,
        status: "pending",
        ...base,
      }, // none, not compliant
    ])
    const { GET } = await import("@/app/api/compliance/documents/route")
    const res = await GET(getReq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    const byId = Object.fromEntries(body.documents.map((d: { id: string }) => [d.id, d]))
    expect(byId.d1).toMatchObject({ band: "valid", compliant: true })
    expect(byId.d2).toMatchObject({ band: "expired", compliant: false })
    expect(byId.d3).toMatchObject({ band: "none", compliant: false })
    expect(body.documents[0].id).toBe("d2") // expired sorts first
    expect(body.meta).toMatchObject({
      total: 3,
      verified: 2,
      pending: 1,
      expired: 1,
      compliant: 1,
      compliancePct: 33,
    })
  })

  it("POST records a document and audit-logs it", async () => {
    queue.push([{ id: "d-new" }])
    const { POST } = await import("@/app/api/compliance/documents/route")
    const res = await POST(postReq({ userId: USER, docType: "passport", title: "Passport" }), ctx)
    expect(res.status).toBe(201)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST rejects a missing title with 422", async () => {
    const { POST } = await import("@/app/api/compliance/documents/route")
    const res = await POST(postReq({ userId: USER, docType: "passport" }), ctx)
    expect(res.status).toBe(422)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("PATCH verify transitions the document and 404s when missing", async () => {
    queue.push([{ id: "d1", status: "verified" }])
    const { PATCH } = await import("@/app/api/compliance/documents/[id]/route")
    const ok = await PATCH(patchReq("d1", { action: "verify" }), ctx)
    expect(ok.status).toBe(200)
    expect((await ok.json()).status).toBe("verified")

    reset()
    queue.push([])
    const { PATCH: P2 } = await import("@/app/api/compliance/documents/[id]/route")
    const miss = await P2(patchReq("nope", { action: "renew" }), ctx)
    expect(miss.status).toBe(404)
  })
})
