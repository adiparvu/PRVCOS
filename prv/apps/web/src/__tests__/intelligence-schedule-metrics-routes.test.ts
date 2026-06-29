import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
  RoleSets: { admin: [], management: [] },
}))

// Chainable query builder. Awaited terminals pull the next seeded result (or []
// when the queue is empty). `limit` / `groupBy` are also awaitable terminals.
const queue: unknown[][] = []
function nextResult(): unknown[] {
  return queue.length ? (queue.shift() ?? []) : []
}

const mockDb = {
  select: vi.fn().mockReturnThis(),
  selectDistinct: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  groupBy: vi.fn(() => Promise.resolve(nextResult())),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(() => Promise.resolve(nextResult())),
  then: (resolve: (val: unknown[]) => void) => resolve(nextResult()),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => {
  // Each table is a proxy returning an opaque column object for any field access.
  const col = () => new Proxy({}, { get: () => ({}) })
  const tables = [
    "shifts",
    "shiftAssignments",
    "users",
    "stores",
    "projects",
    "leaveRequests",
    "orders",
    "clients",
    "expenses",
    "alerts",
  ]
  const mod: Record<string, unknown> = {}
  for (const t of tables) mod[t] = col()
  return mod
})

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    gt: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    lte: vi.fn(),
    isNull: vi.fn(),
    asc: vi.fn(),
    desc: vi.fn(),
    inArray: vi.fn(),
    sum: vi.fn(),
    count: vi.fn(),
  }
})

const webCtx = {
  session: { companyId: "company-1", userId: "user-1", sessionId: "session-1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}

function makeReq(path: string): Request {
  return {
    method: "GET",
    nextUrl: { pathname: path, searchParams: new URLSearchParams() },
    url: `http://localhost${path}`,
    headers: { get: () => null },
  } as unknown as Request
}

function resetMocks() {
  vi.clearAllMocks()
  queue.length = 0
  mockDb.select.mockReturnThis()
  mockDb.selectDistinct.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.innerJoin.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.groupBy.mockImplementation(() => Promise.resolve(nextResult()))
  mockDb.limit.mockImplementation(() => Promise.resolve(nextResult()))
}

// ─── GET /api/intelligence/forecast-metrics ───────────────────────────────────
// All ten queries resolve through `then`, so the seed queue drains in array
// order — precise seeding is deterministic here.

describe("GET /api/intelligence/forecast-metrics", () => {
  beforeEach(resetMocks)

  it("returns the five headline metrics with the expected shape", async () => {
    const { GET } = await import("@/app/api/intelligence/forecast-metrics/route")
    const res = await GET(makeReq("/api/intelligence/forecast-metrics"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.metrics)).toBe(true)
    expect(body.metrics).toHaveLength(5)
    expect(body.metrics.map((m: { label: string }) => m.label)).toEqual([
      "Revenue",
      "Orders",
      "New Clients",
      "Churn Risk",
      "Expenses",
    ])
    for (const m of body.metrics) {
      expect(typeof m.value).toBe("string")
      expect(["up", "down", "flat"]).toContain(m.trendDir)
      expect(typeof m.pct).toBe("number")
    }
  })

  it("computes churn from active clients without a recent order", async () => {
    queue.push(
      [{ v: 0 }], // revThis
      [{ v: 0 }], // revLast
      [{ v: 0 }], // ordThis
      [{ v: 0 }], // ordLast
      [{ v: 0 }], // cliThis
      [{ v: 0 }], // cliLast
      [{ v: 0 }], // expThis
      [{ v: 0 }], // expLast
      [{ clientId: "c1" }], // recentOrderClients — c1 ordered recently
      [{ id: "c1" }, { id: "c2" }, { id: "c3" }] // activeClients — c2, c3 at risk
    )
    const { GET } = await import("@/app/api/intelligence/forecast-metrics/route")
    const res = await GET(makeReq("/api/intelligence/forecast-metrics"), webCtx)
    const body = await res.json()
    const churn = body.metrics.find((m: { label: string }) => m.label === "Churn Risk")
    expect(churn.value).toBe("2")
    expect(churn.trend).toBe("2 at risk")
    expect(churn.trendDir).toBe("down")
  })
})

// ─── GET /api/intelligence/analytics-metrics ──────────────────────────────────
// The store-revenue query terminates in `groupBy` (resolved at array-build
// time), so per-query seeding order is not stable — assert structure only.
// The donut math itself is covered exhaustively in metrics-helpers.test.ts.

describe("GET /api/intelligence/analytics-metrics", () => {
  beforeEach(resetMocks)

  it("returns chart periods, sparklines and a donut array", async () => {
    const { GET } = await import("@/app/api/intelligence/analytics-metrics/route")
    const res = await GET(makeReq("/api/intelligence/analytics-metrics"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Object.keys(body.chart).sort()).toEqual(["1m", "1w", "1y", "3m", "6m"])
    expect(body.chart["1w"].actual).toHaveLength(7)
    expect(body.chart["1y"].actual).toHaveLength(12)
    expect(body.spark.revenue).toHaveLength(7)
    expect(body.spark.orders).toHaveLength(7)
    expect(body.spark.avgOrder).toHaveLength(7)
    expect(body.spark.alerts).toHaveLength(7)
    expect(Array.isArray(body.donut)).toBe(true)
  })
})

// ─── GET /api/schedule (availability + slots) ─────────────────────────────────
// Sequential awaits → deterministic draining: shiftRows, then members, then leave.

describe("GET /api/schedule", () => {
  beforeEach(resetMocks)

  it("returns an empty week with a team-availability grid", async () => {
    queue.push(
      [], // shiftRows (empty → early-return path)
      [] // member rows (active users) — empty, so no leave query runs
    )
    const { GET } = await import("@/app/api/schedule/route")
    const res = await GET(makeReq("/api/schedule"), webCtx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.shifts).toEqual([])
    expect(body.takenSlots).toEqual([])
    expect(body.teamAvailability).toBeDefined()
    expect(body.teamAvailability.days).toEqual(["M", "T", "W", "T", "F", "S", "S"])
    expect(body.teamAvailability.people).toEqual([])
  })

  it("derives availability cells for real members", async () => {
    queue.push(
      [], // shiftRows (empty → early return)
      [{ id: "u1", firstName: "Maria", lastName: "Pop" }], // members
      [{ userId: "u1", startDate: "2000-01-01", endDate: "2000-01-02" }] // leave (non-overlapping)
    )
    const { GET } = await import("@/app/api/schedule/route")
    const res = await GET(makeReq("/api/schedule"), webCtx)
    const body = await res.json()
    expect(body.teamAvailability.people).toEqual(["Maria"])
    const cells = Object.values(body.teamAvailability.values)
    expect(cells).toHaveLength(7)
    // No overlapping leave and no shifts → every cell is "maybe".
    expect(cells.every((c) => c === "maybe")).toBe(true)
  })
})
