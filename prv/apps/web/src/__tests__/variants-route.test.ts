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
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["productVariants", "products"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), asc: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "actor-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const PRODUCT = "prod-1"
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
    "where",
    "limit",
    "orderBy",
    "insert",
    "values",
    "returning",
    "update",
    "set",
    "delete",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("variants routes", () => {
  beforeEach(reset)

  it("GET returns variants with axes + price range", async () => {
    queue.push([{ id: PRODUCT, price: "48" }]) // verifyProduct
    queue.push([
      {
        id: "v1",
        name: "Black / M",
        sku: "BLK-M",
        barcode: null,
        options: { Colour: "Black", Size: "M" },
        price: "45",
        stockQuantity: 28,
        isActive: true,
      },
      {
        id: "v2",
        name: "Hi-vis / M",
        sku: "HIV-M",
        barcode: null,
        options: { Colour: "Hi-vis", Size: "M" },
        price: "52",
        stockQuantity: 15,
        isActive: true,
      },
    ])
    const { GET } = await import("@/app/api/shop/products/[id]/variants/route")
    const res = await GET(rq(`/api/shop/products/${PRODUCT}/variants`), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.variants).toHaveLength(2)
    expect(body.axes).toMatchObject({ Colour: ["Black", "Hi-vis"] })
    expect(body.priceRange).toEqual({ min: 45, max: 52 })
  })

  it("POST adds a variant; 404 for a product outside the company", async () => {
    queue.push([{ id: PRODUCT, price: "48" }]) // verifyProduct
    queue.push([{ id: "v-new" }]) // insert returning
    const { POST } = await import("@/app/api/shop/products/[id]/variants/route")
    const ok = await POST(
      rq(`/api/shop/products/${PRODUCT}/variants`, "POST", {
        name: "Black / L",
        options: { Colour: "Black" },
      }),
      ctx
    )
    expect(ok.status).toBe(201)
    expect(auditSpy).toHaveBeenCalledTimes(1)

    reset()
    queue.push([]) // verifyProduct → none
    const { POST: P2 } = await import("@/app/api/shop/products/[id]/variants/route")
    expect(
      (await P2(rq(`/api/shop/products/${PRODUCT}/variants`, "POST", { name: "X" }), ctx)).status
    ).toBe(404)
  })

  it("PATCH updates a variant and 404s when missing", async () => {
    queue.push([{ id: "v1" }]) // update returning
    const { PATCH } = await import("@/app/api/shop/products/[id]/variants/[variantId]/route")
    const ok = await PATCH(
      rq(`/api/shop/products/${PRODUCT}/variants/v1`, "PATCH", { stockQuantity: 3 }),
      ctx
    )
    expect(ok.status).toBe(200)

    reset()
    queue.push([])
    const { PATCH: P2 } = await import("@/app/api/shop/products/[id]/variants/[variantId]/route")
    expect(
      (
        await P2(
          rq(`/api/shop/products/${PRODUCT}/variants/nope`, "PATCH", { isActive: false }),
          ctx
        )
      ).status
    ).toBe(404)
  })
})
