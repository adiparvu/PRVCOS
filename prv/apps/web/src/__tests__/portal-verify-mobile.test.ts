import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const txInserts: unknown[] = []
const txUpdates: unknown[] = []
const txStub = {
  update: vi.fn(() => ({ set: (v: unknown) => ({ where: () => txUpdates.push(v) }) })),
  insert: vi.fn(() => ({ values: (v: unknown) => txInserts.push(v) })),
}
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(() => nextResult()),
  transaction: vi.fn(async (fn: (tx: typeof txStub) => Promise<void>) => fn(txStub)),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => ({
  companies: {},
  portalAccounts: {},
  portalMagicTokens: { id: {} },
  portalSessions: {},
}))
vi.mock("drizzle-orm", async (o) => {
  const actual = await o<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), gt: vi.fn(), isNull: vi.fn() }
})
const rateLimitMock = vi.fn().mockResolvedValue(undefined)
vi.mock("@prv/cache", () => ({
  enforceRateLimit: (...a: unknown[]) => rateLimitMock(...a),
}))

function makeReq(body: unknown): NextRequest {
  const u = new URL("http://localhost/api/portal/auth/verify-mobile")
  return {
    method: "POST",
    nextUrl: u,
    url: u.toString(),
    headers: { get: () => null },
    json: async () => body,
  } as unknown as NextRequest
}

const VALID = { email: "Ioana@Client.ro", companySlug: "prv", code: "472913" }

async function post(body: unknown): Promise<Response> {
  const { POST } = await import("@/app/api/portal/auth/verify-mobile/route")
  return POST(makeReq(body))
}

beforeEach(() => {
  vi.clearAllMocks()
  queue.length = 0
  txInserts.length = 0
  txUpdates.length = 0
  for (const m of ["select", "from", "where"] as const) mockDb[m].mockReturnThis()
  mockDb.limit.mockImplementation(() => nextResult())
  rateLimitMock.mockResolvedValue(undefined)
})

describe("POST /api/portal/auth/verify-mobile", () => {
  it("answers the same generic 401 for unknown company, unknown account and bad code", async () => {
    queue.push([]) // company → none
    const a = await post(VALID)
    expect(a.status).toBe(401)

    queue.push([{ id: "co-1" }])
    queue.push([]) // account → none
    const b = await post(VALID)
    expect(b.status).toBe(401)

    queue.push([{ id: "co-1" }])
    queue.push([{ id: "acct-1", companyId: "co-1", name: "Ioana", email: "ioana@client.ro" }])
    queue.push([]) // token → none
    const c = await post(VALID)
    expect(c.status).toBe(401)

    expect((await c.json()).code).toBe("INVALID_CODE")
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it("rejects malformed codes without touching the database", async () => {
    const res = await post({ ...VALID, code: "12ab56" })
    expect(res.status).toBe(401)
    expect(mockDb.select).not.toHaveBeenCalled()
  })

  it("mints a session and returns the raw token on a valid code", async () => {
    queue.push([{ id: "co-1" }])
    queue.push([{ id: "acct-1", companyId: "co-1", name: "Ioana", email: "ioana@client.ro" }])
    queue.push([{ id: "tok-1" }])
    const res = await post(VALID)
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(typeof body["token"]).toBe("string")
    expect((body["token"] as string).length).toBeGreaterThan(20)
    expect(body["accountId"]).toBe("acct-1")
    expect(body["companyId"]).toBe("co-1")

    // token marked used + session row + lastLoginAt inside one transaction
    expect(mockDb.transaction).toHaveBeenCalledTimes(1)
    expect(txInserts).toHaveLength(1)
    const session = txInserts[0] as Record<string, unknown>
    expect(session["accountId"]).toBe("acct-1")
    expect(typeof session["tokenHash"]).toBe("string")
    expect(session["tokenHash"]).not.toBe(body["token"]) // stored hashed, never raw
    expect(txUpdates.length).toBe(2) // usedAt + lastLoginAt
  })

  it("429s when the per-account attempt limiter trips", async () => {
    queue.push([{ id: "co-1" }])
    queue.push([{ id: "acct-1", companyId: "co-1", name: "I", email: "i@c.ro" }])
    rateLimitMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("limited"))
    const res = await post(VALID)
    expect(res.status).toBe(429)
  })
})
