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
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["documents", "retentionPolicies"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), desc: vi.fn(), eq: vi.fn(), isNull: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "actor-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const DOC = "55555555-5555-5555-5555-555555555555"
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
    "where",
    "orderBy",
    "insert",
    "values",
    "onConflictDoUpdate",
    "update",
    "set",
    "returning",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("GET /api/documents/retention", () => {
  beforeEach(reset)

  it("bands documents, applies policies, and summarizes", async () => {
    // Promise.all order: docRows, policyRows
    queue.push([
      {
        id: "d1",
        title: "Old contract",
        type: "contract",
        status: "published",
        createdAt: new Date("2015-01-01"),
        expiresAt: new Date("2020-01-01"), // long expired
        legalHold: false,
        legalHoldReason: null,
      },
      {
        id: "d2",
        title: "Held doc",
        type: "report",
        status: "published",
        createdAt: new Date("2015-01-01"),
        expiresAt: new Date("2020-01-01"),
        legalHold: true,
        legalHoldReason: "dispute",
      },
    ])
    queue.push([{ documentType: "contract", retentionMonths: 84, autoArchive: true }])

    const { GET } = await import("@/app/api/documents/retention/route")
    const res = await GET(rq("/api/documents/retention"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meta.total).toBe(2)
    expect(body.meta.expired).toBe(1)
    expect(body.meta.onHold).toBe(1)
    expect(body.meta.autoArchiveEligible).toBe(1) // only the un-held expired contract
    // expired sorts before on_hold
    expect(body.documents[0].id).toBe("d1")
    // policies include all 8 types, contract overridden (not default)
    expect(body.policies).toHaveLength(8)
    expect(
      body.policies.find((p: { documentType: string }) => p.documentType === "contract").isDefault
    ).toBe(false)
    expect(
      body.policies.find((p: { documentType: string }) => p.documentType === "photo").isDefault
    ).toBe(true)
  })

  it("PUT upserts a policy and audits", async () => {
    queue.push([]) // insert/onConflict resolves
    const { PUT } = await import("@/app/api/documents/retention/route")
    const res = await PUT(
      rq("/api/documents/retention", "PUT", {
        documentType: "photo",
        retentionMonths: 24,
        autoArchive: false,
      }),
      ctx
    )
    expect(res.status).toBe(200)
    expect(mockDb.onConflictDoUpdate).toHaveBeenCalledTimes(1)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("PUT 422s on bad retention months", async () => {
    const { PUT } = await import("@/app/api/documents/retention/route")
    const res = await PUT(
      rq("/api/documents/retention", "PUT", {
        documentType: "photo",
        retentionMonths: 0,
        autoArchive: true,
      }),
      ctx
    )
    expect(res.status).toBe(422)
  })
})

describe("POST /api/documents/[id]/legal-hold", () => {
  beforeEach(reset)

  it("places a hold and audits", async () => {
    queue.push([{ id: DOC, legalHold: true }])
    const { POST } = await import("@/app/api/documents/[id]/legal-hold/route")
    const res = await POST(
      rq(`/api/documents/${DOC}/legal-hold`, "POST", { hold: true, reason: "litigation" }),
      ctx
    )
    expect(res.status).toBe(200)
    expect((await res.json()).legalHold).toBe(true)
    const setArg = mockDb.set.mock.calls[0]![0] as {
      legalHold: boolean
      legalHoldReason: string | null
    }
    expect(setArg.legalHold).toBe(true)
    expect(setArg.legalHoldReason).toBe("litigation")
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("clears the reason when releasing", async () => {
    queue.push([{ id: DOC, legalHold: false }])
    const { POST } = await import("@/app/api/documents/[id]/legal-hold/route")
    await POST(rq(`/api/documents/${DOC}/legal-hold`, "POST", { hold: false }), ctx)
    const setArg = mockDb.set.mock.calls[0]![0] as {
      legalHold: boolean
      legalHoldReason: string | null
    }
    expect(setArg.legalHold).toBe(false)
    expect(setArg.legalHoldReason).toBeNull()
  })

  it("404s when the document is missing", async () => {
    queue.push([])
    const { POST } = await import("@/app/api/documents/[id]/legal-hold/route")
    const res = await POST(rq(`/api/documents/${DOC}/legal-hold`, "POST", { hold: true }), ctx)
    expect(res.status).toBe(404)
  })
})
