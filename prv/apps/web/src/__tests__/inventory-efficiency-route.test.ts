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
    url: "http://localhost/api/analytics/inventory-efficiency",
    nextUrl: {
      pathname: "/api/analytics/inventory-efficiency",
      searchParams: new URLSearchParams(),
    },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "where", "groupBy"] as const) mockDb[m].mockReturnThis()
}

describe("GET /api/analytics/inventory-efficiency", () => {
  beforeEach(reset)

  it("joins product cost to on-hand stock and window sell-through", async () => {
    // Promise.all order: productRows, stockRows, soldRows
    queue.push([
      { id: "a", name: "Tap", costPrice: "10" },
      { id: "b", name: "Slab", costPrice: "100" },
    ])
    queue.push([
      { productId: "a", onHand: "25" },
      { productId: "b", onHand: "20" },
    ])
    queue.push([{ productId: "a", sold: "50" }]) // b sold nothing
    const { GET } = await import("@/app/api/analytics/inventory-efficiency/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.periodDays).toBe(90)
    const byId = Object.fromEntries(
      body.products.map((p: { productId: string }) => [p.productId, p])
    )
    expect(byId.a.inventoryValue).toBe(250)
    expect(byId.a.unitsSold).toBe(50)
    expect(byId.a.band).toBe("fast")
    // b has stock but no sales → dead
    expect(byId.b.band).toBe("dead")
    expect(body.deadCount).toBe(1)
    expect(body.deadStockValue).toBe(2000)
    // dead ranked first
    expect(body.products[0].productId).toBe("b")
  })

  it("returns empty portfolio when there are no products", async () => {
    queue.push([])
    queue.push([])
    queue.push([])
    const { GET } = await import("@/app/api/analytics/inventory-efficiency/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.products).toHaveLength(0)
    expect(body.totalInventoryValue).toBe(0)
    expect(body.overallTurnover).toBeNull()
  })
})
