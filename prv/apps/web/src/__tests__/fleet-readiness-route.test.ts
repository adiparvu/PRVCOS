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
  where: vi.fn((..._a: unknown[]) => Promise.resolve(nextResult())),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { vehicles: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), eq: vi.fn(), inArray: vi.fn(), isNull: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/analytics/fleet-readiness",
    nextUrl: { pathname: "/api/analytics/fleet-readiness" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from"] as const) mockDb[m].mockReturnThis()
  mockDb.where.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/analytics/fleet-readiness", () => {
  beforeEach(reset)

  it("assesses the operating fleet and builds an attention list", async () => {
    const inDays = (d: number) => new Date(Date.now() + d * 86_400_000)
    queue.push([
      {
        id: "a",
        make: "Ford",
        model: "Transit",
        licensePlate: "B-1",
        status: "active",
        mileageKm: 10000,
        nextServiceAtKm: null,
        fuelLevelPct: 80,
        insuranceExpiresAt: inDays(200),
        itpExpiresAt: inDays(200),
      },
      {
        id: "b",
        make: "VW",
        model: "Caddy",
        licensePlate: "B-2",
        status: "maintenance",
        mileageKm: 90000,
        nextServiceAtKm: null,
        fuelLevelPct: null,
        insuranceExpiresAt: null,
        itpExpiresAt: null,
      },
      {
        id: "c",
        make: "Dacia",
        model: "Duster",
        licensePlate: "B-3",
        status: "active",
        mileageKm: 60000,
        nextServiceAtKm: 59000,
        fuelLevelPct: 10,
        insuranceExpiresAt: null,
        itpExpiresAt: null,
      },
    ])
    const { GET } = await import("@/app/api/analytics/fleet-readiness/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(3)
    expect(body.ready).toBe(1)
    expect(body.grounded).toBe(1) // b in maintenance
    expect(body.attention).toBe(1) // c service overdue + low fuel
    expect(body.attentionList[0].id).toBe("b") // grounded first
    const c = body.attentionList.find((v: { id: string }) => v.id === "c")
    expect(c.reasons).toContain("Service overdue")
    expect(c.label).toBe("Dacia Duster · B-3")
  })

  it("handles an empty fleet", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/fleet-readiness/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.total).toBe(0)
    expect(body.readinessRatePct).toBeNull()
  })
})
