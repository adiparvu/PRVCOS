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
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["productSuppliers", "products", "suppliers"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), ne: vi.fn(), asc: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "actor-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const PRODUCT = "prod-1"
const SUPPLIER = "11111111-1111-1111-1111-111111111111"
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
    "update",
    "set",
    "delete",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("product-suppliers routes", () => {
  beforeEach(reset)

  it("GET lists links with the preferred first", async () => {
    queue.push([{ id: PRODUCT }]) // verifyProduct
    queue.push([
      {
        id: "l1",
        supplierId: "s1",
        supplierSku: "A",
        cost: "5.95",
        leadTimeDays: 5,
        minOrderQty: null,
        isPreferred: false,
        supplierName: "Dedeman",
      },
      {
        id: "l2",
        supplierId: "s2",
        supplierSku: "B",
        cost: "6.20",
        leadTimeDays: 3,
        minOrderQty: 20,
        isPreferred: true,
        supplierName: "Brico",
      },
    ])
    const { GET } = await import("@/app/api/shop/products/[id]/suppliers/route")
    const res = await GET(rq(`/api/shop/products/${PRODUCT}/suppliers`), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.links[0].id).toBe("l2") // preferred first
    expect(body.links[0].cost).toBe(6.2)
  })

  it("POST links a supplier (preferred → unsets others); 404 for foreign product", async () => {
    queue.push([{ id: PRODUCT }]) // verifyProduct
    queue.push([{ id: "l-new" }]) // insert returning
    queue.push([]) // unset others (isPreferred)
    const { POST } = await import("@/app/api/shop/products/[id]/suppliers/route")
    const ok = await POST(
      rq(`/api/shop/products/${PRODUCT}/suppliers`, "POST", {
        supplierId: SUPPLIER,
        cost: 6.2,
        isPreferred: true,
      }),
      ctx
    )
    expect(ok.status).toBe(201)
    expect(mockDb.update).toHaveBeenCalledTimes(1) // preferred exclusivity
    expect(auditSpy).toHaveBeenCalledTimes(1)

    reset()
    queue.push([]) // verifyProduct → none
    const { POST: P2 } = await import("@/app/api/shop/products/[id]/suppliers/route")
    expect(
      (
        await P2(
          rq(`/api/shop/products/${PRODUCT}/suppliers`, "POST", { supplierId: SUPPLIER }),
          ctx
        )
      ).status
    ).toBe(404)
  })

  it("PATCH sets preferred (unsets others) and 404s when missing", async () => {
    queue.push([{ id: "l1" }]) // update returning
    queue.push([]) // unset others
    const { PATCH } = await import("@/app/api/shop/products/[id]/suppliers/[linkId]/route")
    const ok = await PATCH(
      rq(`/api/shop/products/${PRODUCT}/suppliers/l1`, "PATCH", { isPreferred: true }),
      ctx
    )
    expect(ok.status).toBe(200)
    expect(mockDb.update).toHaveBeenCalledTimes(2) // target + unset others

    reset()
    queue.push([])
    const { PATCH: P2 } = await import("@/app/api/shop/products/[id]/suppliers/[linkId]/route")
    expect(
      (await P2(rq(`/api/shop/products/${PRODUCT}/suppliers/nope`, "PATCH", { cost: 5 }), ctx))
        .status
    ).toBe(404)
  })
})
