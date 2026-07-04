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
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { notifications: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), desc: vi.fn(), eq: vi.fn(), gte: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/notifications/digest",
    nextUrl: { pathname: "/api/notifications/digest", searchParams: new URLSearchParams() },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "where", "orderBy"] as const) mockDb[m].mockReturnThis()
}

describe("GET /api/notifications/digest", () => {
  beforeEach(reset)

  it("groups the window into a digest with a summary and action count", async () => {
    const now = new Date()
    queue.push([
      {
        id: "1",
        type: "action_required",
        title: "Invoice due",
        body: "€100",
        actionUrl: "/finance",
        entityType: "invoice",
        createdAt: now,
      },
      {
        id: "2",
        type: "info",
        title: "Task done",
        body: null,
        actionUrl: null,
        entityType: "task",
        createdAt: now,
      },
      {
        id: "3",
        type: "info",
        title: "Another task",
        body: null,
        actionUrl: null,
        entityType: "task",
        createdAt: now,
      },
    ])
    const { GET } = await import("@/app/api/notifications/digest/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(3)
    expect(body.actionRequired).toBe(1)
    expect(body.windowHours).toBe(24)
    expect(body.summary).toBe("2 tasks · 1 invoice")
    expect(body.groups[0].key).toBe("task")
  })

  it("returns an empty caught-up digest", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/notifications/digest/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.total).toBe(0)
    expect(body.summary).toBe("You're all caught up.")
  })
})
