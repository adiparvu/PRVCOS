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
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["announcements", "announcementAcknowledgments"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), desc: vi.fn(), eq: vi.fn(), isNull: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const ANN = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
function rq(url: string, method = "GET") {
  const u = new URL(`http://localhost${url}`)
  return {
    method,
    nextUrl: { pathname: u.pathname, searchParams: u.searchParams },
    url: u.toString(),
    json: async () => ({}),
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
    "limit",
    "insert",
    "values",
    "onConflictDoNothing",
    "returning",
    "update",
    "set",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("GET /api/communications/announcements/receipts", () => {
  beforeEach(reset)

  it("computes read/ack coverage and attention meta", async () => {
    queue.push([
      {
        id: "a1",
        title: "Critical notice",
        priority: "critical",
        audience: "all",
        acknowledgmentRequired: true,
        totalAudience: 100,
        readCount: 90,
        ackCount: 60,
        publishedAt: new Date("2026-06-01"),
        scheduledAt: null,
        expiresAt: new Date("2100-01-01"),
      },
      {
        id: "a2",
        title: "Info memo",
        priority: "info",
        audience: "employees",
        acknowledgmentRequired: false,
        totalAudience: 50,
        readCount: 25,
        ackCount: 0,
        publishedAt: new Date("2026-06-10"),
        scheduledAt: null,
        expiresAt: null,
      },
    ])
    const { GET } = await import("@/app/api/communications/announcements/receipts/route")
    const res = await GET(rq("/api/communications/announcements/receipts"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.announcements).toHaveLength(2)
    expect(body.announcements[0].receipt.ackPct).toBe(60)
    expect(body.announcements[1].receipt.readPct).toBe(50)
    expect(body.meta.needsAttention).toBe(1) // a1 active, ack required, 40 unacked
    expect(body.meta.critical).toBe(1)
  })
})

describe("POST /api/communications/announcements/[id]/acknowledge", () => {
  beforeEach(reset)

  it("records a new acknowledgment and bumps the counter", async () => {
    queue.push([{ id: ANN }]) // announcement lookup
    queue.push([{ id: "ack1" }]) // insert returning (new)
    const { POST } = await import("@/app/api/communications/announcements/[id]/acknowledge/route")
    const res = await POST(rq(`/api/communications/announcements/${ANN}/acknowledge`, "POST"), ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).acknowledged).toBe(true)
    expect(mockDb.update).toHaveBeenCalledTimes(1) // counter bumped
  })

  it("is idempotent — no counter bump on repeat", async () => {
    queue.push([{ id: ANN }]) // lookup
    queue.push([]) // insert returning empty (conflict)
    const { POST } = await import("@/app/api/communications/announcements/[id]/acknowledge/route")
    const res = await POST(rq(`/api/communications/announcements/${ANN}/acknowledge`, "POST"), ctx)
    expect(res.status).toBe(200)
    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it("404s for a missing announcement", async () => {
    queue.push([]) // lookup → none
    const { POST } = await import("@/app/api/communications/announcements/[id]/acknowledge/route")
    const res = await POST(rq(`/api/communications/announcements/${ANN}/acknowledge`, "POST"), ctx)
    expect(res.status).toBe(404)
  })
})
