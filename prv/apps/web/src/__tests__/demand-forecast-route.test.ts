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
  groupBy: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { products: col(), stockLevels: col(), stockMovements: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    and: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    isNull: vi.fn(),
    max: vi.fn(),
    sum: vi.fn(),
    sql: Object.assign(vi.fn(), { raw: vi.fn() }),
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
    url: "http://localhost/api/analytics/demand-forecast",
    nextUrl: { pathname: "/api/analytics/demand-forecast", searchParams: new URLSearchParams() },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "where", "groupBy"] as const) mockDb[m].mockReturnThis()
}

describe("GET /api/analytics/demand-forecast", () => {
  beforeEach(reset)

  it("joins stock, reorder points and sale velocity into a reorder plan", async () => {
    // Promise.all order: productRows, stockRows, soldRows
    queue.push([
      { id: "a", name: "Tap", costPrice: "5" },
      { id: "b", name: "Slab", costPrice: "100" },
    ])
    queue.push([
      { productId: "a", onHand: "6", minimum: "5", reorderPoint: "10" },
      { productId: "b", onHand: "40", minimum: "0", reorderPoint: null },
    ])
    queue.push([{ productId: "a", sold: "180" }]) // b sold nothing
    const { GET } = await import("@/app/api/analytics/demand-forecast/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.horizonDays).toBe(30)
    expect(body.windowDays).toBe(90)
    const byId = Object.fromEntries(
      body.products.map((p: { productId: string }) => [p.productId, p])
    )
    expect(byId.a.band).toBe("critical") // 6 on hand ≤ reorderPoint 10
    expect(byId.a.suggestedReorderQty).toBeGreaterThan(0)
    expect(byId.b.band).toBe("overstock") // stock, no sales
    expect(body.criticalCount).toBe(1)
    // critical ranked first
    expect(body.products[0].productId).toBe("a")
  })

  it("returns an empty plan when there are no products", async () => {
    queue.push([])
    queue.push([])
    queue.push([])
    const { GET } = await import("@/app/api/analytics/demand-forecast/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.products).toHaveLength(0)
    expect(body.totalSuggestedUnits).toBe(0)
    expect(body.totalSuggestedValue).toBe(0)
  })
})
