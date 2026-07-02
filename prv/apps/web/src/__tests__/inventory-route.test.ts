import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))
const auditSpy = vi.fn().mockResolvedValue(undefined)
vi.mock("@prv/auth", () => ({ writeAuditLog: auditSpy, RoleSets: { admin: [] } }))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["stockLevels", "stockMovements", "products", "stores", "users"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), asc: vi.fn(), desc: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "actor-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const PRODUCT = "11111111-1111-1111-1111-111111111111"
const STORE = "22222222-2222-2222-2222-222222222222"
function rq(url: string, method = "GET", body?: unknown) {
  const u = new URL(`http://localhost${url}`)
  return {
    method,
    nextUrl: { pathname: u.pathname, searchParams: u.searchParams },
    url: u.toString(),
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of [
    "select",
    "from",
    "leftJoin",
    "where",
    "orderBy",
    "limit",
    "insert",
    "values",
    "onConflictDoUpdate",
    "returning",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("inventory routes", () => {
  beforeEach(reset)

  it("GET levels bands status, sorts worst-first, and summarizes", async () => {
    queue.push([
      {
        id: "l1",
        productId: "p1",
        storeId: STORE,
        quantity: 42,
        minimum: 8,
        reorderPoint: 20,
        productName: "Battery",
        sku: "MK-5AH",
        storeName: "WH",
      }, // ok
      {
        id: "l2",
        productId: "p2",
        storeId: STORE,
        quantity: 0,
        minimum: 4,
        reorderPoint: null,
        productName: "Drill",
        sku: "BSH",
        storeName: "WH",
      }, // out
      {
        id: "l3",
        productId: "p3",
        storeId: STORE,
        quantity: 9,
        minimum: 10,
        reorderPoint: null,
        productName: "Sealant",
        sku: "SIK",
        storeName: "WH",
      }, // low
    ])
    const { GET } = await import("@/app/api/inventory/route")
    const res = await GET(rq("/api/inventory"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.levels[0].id).toBe("l2") // out sorts first
    expect(body.meta).toMatchObject({ skus: 3, totalUnits: 51, out: 1, low: 1 })
  })

  it("POST movement upserts the level and logs a receive", async () => {
    queue.push([{ id: PRODUCT }]) // verify product
    queue.push([{ quantity: 18 }]) // current level
    queue.push([]) // upsert level
    queue.push([{ id: "mv-1" }]) // insert movement returning
    const { POST } = await import("@/app/api/inventory/movements/route")
    const res = await POST(
      rq("/api/inventory/movements", "POST", {
        productId: PRODUCT,
        storeId: STORE,
        type: "receive",
        quantity: 40,
      }),
      ctx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toMatchObject({ delta: 40, balanceAfter: 58 })
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST adjust sets the level to an absolute value", async () => {
    queue.push([{ id: PRODUCT }])
    queue.push([{ quantity: 10 }]) // current 10
    queue.push([])
    queue.push([{ id: "mv-2" }])
    const { POST } = await import("@/app/api/inventory/movements/route")
    const res = await POST(
      rq("/api/inventory/movements", "POST", {
        productId: PRODUCT,
        storeId: STORE,
        type: "adjust",
        quantity: 3,
      }),
      ctx
    )
    const body = await res.json()
    expect(body).toMatchObject({ delta: -7, balanceAfter: 3 })
  })

  it("POST 404s for a product outside the company", async () => {
    queue.push([]) // verify product → none
    const { POST } = await import("@/app/api/inventory/movements/route")
    const res = await POST(
      rq("/api/inventory/movements", "POST", {
        productId: PRODUCT,
        storeId: STORE,
        type: "receive",
        quantity: 5,
      }),
      ctx
    )
    expect(res.status).toBe(404)
  })
})
