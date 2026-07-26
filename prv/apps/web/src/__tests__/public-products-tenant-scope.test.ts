import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  as: vi.fn().mockReturnThis(),
  limit: vi.fn(() => nextResult()),
  then: (r: (v: unknown[]) => void) => r(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => ({
  products: {},
  productCategories: {},
  productReviews: {},
  companies: {},
}))
vi.mock("drizzle-orm", async (o) => {
  const actual = await o<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    desc: vi.fn(),
    avg: vi.fn(() => ({ as: vi.fn() })),
    count: vi.fn(() => ({ as: vi.fn() })),
  }
})

function req(url: string): NextRequest {
  const u = new URL(`http://localhost${url}`)
  return {
    method: "GET",
    nextUrl: u,
    url: u.toString(),
    headers: { get: () => null },
  } as unknown as NextRequest
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "leftJoin", "where", "groupBy", "orderBy", "as"] as const)
    mockDb[m].mockReturnThis()
  mockDb.limit.mockImplementation(() => nextResult())
  delete process.env["PUBLIC_COMPANY_SLUG"]
}

describe("GET /api/public/shop/products — tenant scoping", () => {
  beforeEach(reset)

  it("returns nothing when no public company can be resolved", async () => {
    const { GET } = await import("@/app/api/public/shop/products/route")
    const res = await GET(req("/api/public/shop/products"))
    const body = await res.json()
    expect(body.products).toEqual([])
    expect(body.reason).toBe("no_public_company")
    // never reaches the product query — no leak
    expect(mockDb.select).not.toHaveBeenCalled()
  })

  it("returns nothing when the requested company does not exist", async () => {
    queue.push([]) // company lookup → none
    const { GET } = await import("@/app/api/public/shop/products/route")
    const res = await GET(req("/api/public/shop/products?companySlug=ghost"))
    const body = await res.json()
    expect(body.products).toEqual([])
    expect(body.reason).toBe("unknown_company")
  })

  it("scopes to the resolved company when one is given", async () => {
    queue.push([{ id: "co-1" }]) // company lookup
    queue.push([]) // products
    const { GET } = await import("@/app/api/public/shop/products/route")
    const res = await GET(req("/api/public/shop/products?companySlug=prv"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reason).toBeUndefined()
  })

  it("falls back to PUBLIC_COMPANY_SLUG when no param is given", async () => {
    process.env["PUBLIC_COMPANY_SLUG"] = "prv"
    queue.push([{ id: "co-1" }])
    queue.push([])
    const { GET } = await import("@/app/api/public/shop/products/route")
    const res = await GET(req("/api/public/shop/products"))
    expect(res.status).toBe(200)
    expect((await res.json()).reason).toBeUndefined()
  })
})
