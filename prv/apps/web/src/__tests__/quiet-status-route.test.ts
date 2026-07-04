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
  limit: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { notificationPreferences: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), eq: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq(now?: string) {
  const u = new URL("http://localhost/api/notifications/quiet-status")
  if (now) u.searchParams.set("now", now)
  return {
    method: "GET",
    url: u.toString(),
    nextUrl: { pathname: u.pathname, searchParams: u.searchParams },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "where", "limit"] as const) mockDb[m].mockReturnThis()
}

describe("GET /api/notifications/quiet-status", () => {
  beforeEach(reset)

  it("reports currently quiet within a wrap-around window using the client now", async () => {
    queue.push([{ quietHoursStart: "22:00", quietHoursEnd: "07:00" }])
    const { GET } = await import("@/app/api/notifications/quiet-status/route")
    const body = await (await GET(rq("23:30"), ctx)).json()
    expect(body.quietHours).toEqual({ start: "22:00", end: "07:00" })
    expect(body.currentlyQuiet).toBe(true)
    expect(body.now).toBe("23:30")
  })

  it("reports not quiet outside the window", async () => {
    queue.push([{ quietHoursStart: "22:00", quietHoursEnd: "07:00" }])
    const { GET } = await import("@/app/api/notifications/quiet-status/route")
    const body = await (await GET(rq("12:00"), ctx)).json()
    expect(body.currentlyQuiet).toBe(false)
  })

  it("returns null quietHours when the user has none set", async () => {
    queue.push([{ quietHoursStart: null, quietHoursEnd: null }])
    const { GET } = await import("@/app/api/notifications/quiet-status/route")
    const body = await (await GET(rq("23:30"), ctx)).json()
    expect(body.quietHours).toBeNull()
    expect(body.currentlyQuiet).toBe(false)
  })

  it("handles a user with no preferences row", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/notifications/quiet-status/route")
    const res = await GET(rq("23:30"), ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).quietHours).toBeNull()
  })
})
