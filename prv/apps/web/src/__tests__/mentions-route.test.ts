import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
vi.mock("@prv/auth", () => ({ writeAuditLog: vi.fn(), RoleSets: { admin: [] } }))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["channelMessages", "chatChannels", "users"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    and: vi.fn(),
    arrayContains: vi.fn(),
    desc: vi.fn(),
    eq: vi.fn(),
    isNull: vi.fn(),
  }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/communications/mentions",
    nextUrl: { pathname: "/api/communications/mentions", searchParams: new URLSearchParams() },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "leftJoin", "where", "orderBy", "limit"] as const)
    mockDb[m].mockReturnThis()
}

describe("GET /api/communications/mentions", () => {
  beforeEach(reset)

  it("maps mentioning messages into snippets + summary", async () => {
    queue.push([
      {
        id: "m1",
        channelId: "c1",
        channelName: "renovari",
        content: "  @you  please   confirm the schedule\n\ntomorrow  ",
        authorFirst: "Ana",
        authorLast: "Pop",
        createdAt: new Date(),
      },
      {
        id: "m2",
        channelId: "c2",
        channelName: null,
        content: "older mention @you",
        authorFirst: null,
        authorLast: null,
        createdAt: new Date("2026-01-01"),
      },
    ])
    const { GET } = await import("@/app/api/communications/mentions/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mentions).toHaveLength(2)
    // snippet collapses whitespace
    expect(body.mentions[0].snippet).toBe("@you please confirm the schedule tomorrow")
    expect(body.mentions[0].authorName).toBe("Ana Pop")
    expect(body.mentions[1].authorName).toBeNull()
    expect(body.meta.total).toBe(2)
    expect(body.meta.today).toBe(1)
  })

  it("returns an empty list with zeroed meta when there are no mentions", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/communications/mentions/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.mentions).toEqual([])
    expect(body.meta).toEqual({ total: 0, today: 0, week: 0 })
  })
})
