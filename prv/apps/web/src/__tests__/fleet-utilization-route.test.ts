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
  where: vi.fn((..._a: unknown[]) => Promise.resolve(nextResult())),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { vehicleDailyLogs: col(), vehicles: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), eq: vi.fn(), gte: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/analytics/fleet-utilization",
    nextUrl: { pathname: "/api/analytics/fleet-utilization" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "leftJoin"] as const) mockDb[m].mockReturnThis()
  mockDb.where.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/analytics/fleet-utilization", () => {
  beforeEach(reset)

  it("aggregates odometer logs into per-vehicle km driven", async () => {
    queue.push([
      {
        vehicleId: "a",
        date: "2026-07-01",
        odometerKm: 10000,
        make: "Ford",
        model: "Transit",
        licensePlate: "B-1",
      },
      {
        vehicleId: "a",
        date: "2026-07-20",
        odometerKm: 10800,
        make: "Ford",
        model: "Transit",
        licensePlate: "B-1",
      },
      {
        vehicleId: "b",
        date: "2026-07-05",
        odometerKm: 5000,
        make: "VW",
        model: "Caddy",
        licensePlate: "B-2",
      },
    ])
    const { GET } = await import("@/app/api/analytics/fleet-utilization/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.windowDays).toBe(30)
    expect(body.vehiclesLogged).toBe(2)
    expect(body.activeVehicles).toBe(1) // only a moved
    expect(body.totalKm).toBe(800)
    expect(body.vehicles[0].vehicleId).toBe("a")
    expect(body.vehicles[0].label).toBe("Ford Transit · B-1")
  })

  it("handles no logs", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/fleet-utilization/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.totalKm).toBe(0)
    expect(body.avgKmPerActive).toBeNull()
  })
})
