import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

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
  innerJoin: vi.fn().mockReturnThis(),
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
  for (const t of ["documentShares", "documentShareAccessLog", "documents", "users"]) mod[t] = col()
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
const DOC = "66666666-6666-6666-6666-666666666666"
const SHARE = "77777777-7777-7777-7777-777777777777"
const USER = "88888888-8888-8888-8888-888888888888"
function rq(url: string, method = "GET", body?: unknown) {
  const u = new URL(`http://localhost${url}`)
  return {
    method,
    nextUrl: { pathname: u.pathname, searchParams: u.searchParams },
    url: u.toString(),
    json: async () => body,
    headers: { get: () => null },
  } as unknown as NextRequest
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of [
    "select",
    "from",
    "leftJoin",
    "innerJoin",
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

describe("document shares collection", () => {
  beforeEach(reset)

  it("GET lists shares with a status summary", async () => {
    queue.push([
      {
        id: "sh1",
        scope: "external",
        permission: "download",
        granteeFirst: null,
        granteeLast: null,
        token: "tok123",
        passwordProtected: true,
        expiresAt: new Date("2100-01-01"),
        revokedAt: null,
        accessCount: 3,
        lastAccessedAt: null,
        note: null,
        createdAt: new Date("2026-06-01"),
      },
      {
        id: "sh2",
        scope: "internal",
        permission: "view",
        granteeFirst: "Ana",
        granteeLast: "Pop",
        token: null,
        passwordProtected: false,
        expiresAt: null,
        revokedAt: new Date("2026-06-15"),
        accessCount: 0,
        lastAccessedAt: null,
        note: null,
        createdAt: new Date("2026-06-02"),
      },
    ])
    const { GET } = await import("@/app/api/documents/[id]/shares/route")
    const res = await GET(rq(`/api/documents/${DOC}/shares`), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.shares).toHaveLength(2)
    expect(body.meta.total).toBe(2)
    expect(body.meta.active).toBe(1)
    expect(body.meta.external).toBe(1)
    expect(body.meta.revoked).toBe(1)
    expect(body.shares[0].status).toBe("active")
  })

  it("POST creates an external share with a token and audits", async () => {
    queue.push([{ id: DOC }]) // doc lookup
    queue.push([{ id: SHARE }]) // insert returning
    const { POST } = await import("@/app/api/documents/[id]/shares/route")
    const res = await POST(
      rq(`/api/documents/${DOC}/shares`, "POST", { scope: "external", permission: "download" }),
      ctx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe(SHARE)
    expect(typeof body.token).toBe("string")
    expect(body.token.length).toBeGreaterThan(20)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST 404s for a missing document", async () => {
    queue.push([]) // doc lookup → none
    const { POST } = await import("@/app/api/documents/[id]/shares/route")
    const res = await POST(
      rq(`/api/documents/${DOC}/shares`, "POST", { scope: "external", permission: "view" }),
      ctx
    )
    expect(res.status).toBe(404)
  })

  it("POST 422s for an internal share without a grantee", async () => {
    const { POST } = await import("@/app/api/documents/[id]/shares/route")
    const res = await POST(
      rq(`/api/documents/${DOC}/shares`, "POST", { scope: "internal", permission: "view" }),
      ctx
    )
    expect(res.status).toBe(422)
  })

  it("POST creates an internal share for a grantee", async () => {
    queue.push([{ id: DOC }])
    queue.push([{ id: SHARE }])
    const { POST } = await import("@/app/api/documents/[id]/shares/route")
    const res = await POST(
      rq(`/api/documents/${DOC}/shares`, "POST", {
        scope: "internal",
        permission: "edit",
        granteeUserId: USER,
      }),
      ctx
    )
    expect(res.status).toBe(201)
    expect((await res.json()).token).toBeNull()
  })
})

describe("revoke share", () => {
  beforeEach(reset)

  it("DELETE revokes and audits, 404 when missing", async () => {
    queue.push([{ id: SHARE }])
    const { DELETE } = await import("@/app/api/documents/[id]/shares/[shareId]/route")
    const ok = await DELETE(rq(`/api/documents/${DOC}/shares/${SHARE}`, "DELETE"), ctx)
    expect(ok.status).toBe(200)
    expect(auditSpy).toHaveBeenCalledTimes(1)

    reset()
    queue.push([])
    const { DELETE: D2 } = await import("@/app/api/documents/[id]/shares/[shareId]/route")
    expect((await D2(rq(`/api/documents/${DOC}/shares/${SHARE}`, "DELETE"), ctx)).status).toBe(404)
  })
})

describe("public share resolver", () => {
  beforeEach(reset)

  it("resolves an active external link and exposes the file for download permission", async () => {
    queue.push([
      {
        id: SHARE,
        scope: "external",
        permission: "download",
        passwordProtected: false,
        expiresAt: new Date("2100-01-01"),
        revokedAt: null,
        title: "Contract",
        fileName: "contract.pdf",
        mimeType: "application/pdf",
        fileUrl: "https://files/contract.pdf",
      },
    ])
    const { GET } = await import("@/app/api/share/[token]/route")
    const res = await GET(rq("/api/share/tok123"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.title).toBe("Contract")
    expect(body.fileUrl).toBe("https://files/contract.pdf")
  })

  it("hides the file url for view-only permission", async () => {
    queue.push([
      {
        id: SHARE,
        scope: "external",
        permission: "view",
        passwordProtected: false,
        expiresAt: null,
        revokedAt: null,
        title: "Doc",
        fileName: "d.pdf",
        mimeType: "application/pdf",
        fileUrl: "https://files/d.pdf",
      },
    ])
    const { GET } = await import("@/app/api/share/[token]/route")
    const body = await (await GET(rq("/api/share/tok"))).json()
    expect(body.fileUrl).toBeNull()
  })

  it("410s for a revoked or expired link", async () => {
    queue.push([
      {
        id: SHARE,
        scope: "external",
        permission: "view",
        passwordProtected: false,
        expiresAt: null,
        revokedAt: new Date("2026-06-01"),
        title: "Doc",
        fileName: "d.pdf",
        mimeType: "application/pdf",
        fileUrl: "https://files/d.pdf",
      },
    ])
    const { GET } = await import("@/app/api/share/[token]/route")
    const res = await GET(rq("/api/share/tok"))
    expect(res.status).toBe(410)
    expect((await res.json()).code).toBe("LINK_INACTIVE")
  })

  it("404s for an unknown token", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/share/[token]/route")
    expect((await GET(rq("/api/share/nope"))).status).toBe(404)
  })
})
