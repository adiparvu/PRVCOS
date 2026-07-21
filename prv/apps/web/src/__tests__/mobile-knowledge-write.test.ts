import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

vi.mock("@/lib/mobile/auth", () => ({ withMobileAuth: (h: unknown) => h }))
vi.mock("@prv/auth", () => ({ writeAuditLog: vi.fn() }))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(() => nextResult()),
  set: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  returning: vi.fn(() => nextResult()),
  then: (r: (v: unknown[]) => void) => r(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => ({
  knowledgeArticles: {},
  articleReadProgress: {},
  articleFeedback: {},
  users: {},
}))
vi.mock("drizzle-orm", async (o) => {
  const actual = await o<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    desc: vi.fn(),
    gte: vi.fn(),
    sql: vi.fn(),
  }
})

const ctx = { companyId: "co-1", userId: "u-1", sessionId: "s-1" }
const A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
function req(url: string, method: string, body?: unknown): NextRequest {
  const u = new URL(`http://localhost${url}`)
  return {
    method,
    nextUrl: { pathname: u.pathname, searchParams: u.searchParams },
    url: u.toString(),
    json: async () => body ?? {},
    headers: { get: () => null },
  } as unknown as NextRequest
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of [
    "select",
    "insert",
    "update",
    "from",
    "where",
    "set",
    "values",
    "onConflictDoUpdate",
  ] as const)
    mockDb[m].mockReturnThis()
  mockDb.limit.mockImplementation(() => nextResult())
  mockDb.returning.mockImplementation(() => nextResult())
}

describe("mobile knowledge create/edit/delete", () => {
  beforeEach(reset)

  it("POST creates an article (201)", async () => {
    queue.push([{ id: "k-1", title: "SOP" }]) // insert returning
    const { POST } = await import("@/app/api/mobile/knowledge/route")
    const res = await POST(req("/api/mobile/knowledge", "POST", { title: "SOP" }), ctx)
    expect(res.status).toBe(201)
  })

  it("POST 422 on empty title", async () => {
    const { POST } = await import("@/app/api/mobile/knowledge/route")
    const res = await POST(req("/api/mobile/knowledge", "POST", { title: "" }), ctx)
    expect(res.status).toBe(422)
  })

  it("PATCH pins an article (200)", async () => {
    queue.push([{ id: A, title: "SOP" }]) // existing
    queue.push([{ id: A, isPinned: true }]) // update returning
    const { PATCH } = await import("@/app/api/mobile/knowledge/[id]/route")
    const res = await PATCH(req(`/api/mobile/knowledge/${A}`, "PATCH", { isPinned: true }), ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).isPinned).toBe(true)
  })

  it("PATCH 404 when missing", async () => {
    queue.push([]) // no existing
    const { PATCH } = await import("@/app/api/mobile/knowledge/[id]/route")
    const res = await PATCH(req(`/api/mobile/knowledge/${A}`, "PATCH", { isPinned: true }), ctx)
    expect(res.status).toBe(404)
  })

  it("DELETE soft-deletes (204)", async () => {
    queue.push([{ id: A, title: "SOP" }]) // existing
    const { DELETE } = await import("@/app/api/mobile/knowledge/[id]/route")
    const res = await DELETE(req(`/api/mobile/knowledge/${A}`, "DELETE"), ctx)
    expect(res.status).toBe(204)
  })
})

describe("mobile knowledge progress + feedback", () => {
  beforeEach(reset)

  it("POST progress upserts (200)", async () => {
    queue.push([{ id: A }]) // article scope check
    queue.push([{ progressPct: 50, lastReadAt: new Date() }]) // upsert returning
    const { POST } = await import("@/app/api/mobile/knowledge/[id]/progress/route")
    const res = await POST(
      req(`/api/mobile/knowledge/${A}/progress`, "POST", { progressPct: 50 }),
      ctx
    )
    expect(res.status).toBe(200)
  })

  it("POST progress 404 when article missing", async () => {
    queue.push([]) // no article
    const { POST } = await import("@/app/api/mobile/knowledge/[id]/progress/route")
    const res = await POST(
      req(`/api/mobile/knowledge/${A}/progress`, "POST", { progressPct: 50 }),
      ctx
    )
    expect(res.status).toBe(404)
  })

  it("POST feedback records a vote (201)", async () => {
    queue.push([{ id: A }]) // article scope check
    const { POST } = await import("@/app/api/mobile/knowledge/[id]/feedback/route")
    const res = await POST(
      req(`/api/mobile/knowledge/${A}/feedback`, "POST", { rating: "helpful" }),
      ctx
    )
    expect(res.status).toBe(201)
  })

  it("POST feedback 422 on bad rating", async () => {
    const { POST } = await import("@/app/api/mobile/knowledge/[id]/feedback/route")
    const res = await POST(
      req(`/api/mobile/knowledge/${A}/feedback`, "POST", { rating: "meh" }),
      ctx
    )
    expect(res.status).toBe(422)
  })
})
