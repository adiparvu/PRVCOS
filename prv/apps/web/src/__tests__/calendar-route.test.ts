import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  RoleSets: { admin: [] },
}))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of [
    "projects",
    "projectMilestones",
    "shifts",
    "leaveRequests",
    "invoices",
    "users",
    "clients",
  ])
    mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    isNull: vi.fn(),
    inArray: vi.fn(),
  }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function req(qs = "") {
  return {
    method: "GET",
    nextUrl: { pathname: "/api/calendar", searchParams: new URLSearchParams(qs) },
    url: `http://localhost/api/calendar?${qs}`,
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  mockDb.select.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.innerJoin.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.where.mockReturnThis()
}

describe("GET /api/calendar", () => {
  beforeEach(reset)

  it("returns an empty event list + range when there is no data", async () => {
    const { GET } = await import("@/app/api/calendar/route")
    const res = await GET(req("from=2026-07-01&to=2026-07-31"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.events).toEqual([])
    expect(body.range).toEqual({ from: "2026-07-01", to: "2026-07-31" })
  })

  it("aggregates modules and expands multi-day leave per day", async () => {
    queue.push(
      [{ id: "p1", name: "Kitchen Reno", dueDate: "2026-07-02" }],
      [],
      [
        {
          id: "s1",
          title: "Foreman shift",
          roleLabel: "Foreman",
          date: "2026-07-02",
          startTime: "08:00:00",
          endTime: "16:00:00",
        },
      ],
      [
        {
          id: "i1",
          invoiceNumber: "2041",
          total: "4820",
          status: "sent",
          dueDate: "2026-07-02",
          clientName: "Ionescu SRL",
        },
      ],
      [
        {
          id: "l1",
          type: "annual",
          label: null,
          startDate: "2026-07-02",
          endDate: "2026-07-03",
          firstName: "Maria",
          lastName: "Pop",
        },
      ]
    )
    const { GET } = await import("@/app/api/calendar/route")
    const res = await GET(req("from=2026-07-01&to=2026-07-31"), ctx)
    const body = await res.json()
    const mods = body.events.map((e: { module: string }) => e.module)
    expect(body.events).toHaveLength(5)
    expect(mods.filter((m: string) => m === "leave")).toHaveLength(2)
    const leaveDays = body.events
      .filter((e: { module: string }) => e.module === "leave")
      .map((e: { date: string }) => e.date)
    expect(leaveDays.sort()).toEqual(["2026-07-02", "2026-07-03"])
    const proj = body.events.find((e: { module: string }) => e.module === "projects")
    expect(proj.title).toContain("Kitchen Reno")
    expect(proj.date).toBe("2026-07-02")
  })

  it("defaults the range to the current month when params are absent", async () => {
    const { GET } = await import("@/app/api/calendar/route")
    const res = await GET(req(""), ctx)
    const body = await res.json()
    expect(body.range.from).toMatch(/^\d{4}-\d{2}-01$/)
    expect(body.range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
