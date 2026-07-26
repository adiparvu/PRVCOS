import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(() => nextResult()),
  then: (r: (v: unknown[]) => void) => r(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => ({
  products: {},
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
    lt: vi.fn(),
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
  for (const m of ["select", "from", "where", "orderBy"] as const) mockDb[m].mockReturnThis()
  mockDb.limit.mockImplementation(() => nextResult())
  delete process.env["PUBLIC_COMPANY_SLUG"]
}

const PATH = "/api/public/shop/products/prod-1/reviews"

describe("GET /api/public/shop/products/[id]/reviews", () => {
  beforeEach(reset)

  it("fails closed when no public company can be resolved", async () => {
    const { GET } = await import("@/app/api/public/shop/products/[id]/reviews/route")
    const body = await (await GET(req(PATH))).json()
    expect(body.reviews).toEqual([])
    expect(body.reason).toBe("no_public_company")
    expect(mockDb.select).not.toHaveBeenCalled()
  })

  it("fails closed on an unknown company", async () => {
    queue.push([]) // company lookup → none
    const { GET } = await import("@/app/api/public/shop/products/[id]/reviews/route")
    const body = await (await GET(req(`${PATH}?companySlug=ghost`))).json()
    expect(body.reviews).toEqual([])
    expect(body.reason).toBe("unknown_company")
  })

  it("404s when the product is not publicly visible in the tenant", async () => {
    queue.push([{ id: "co-1" }]) // company
    queue.push([]) // product lookup → none (other tenant / inactive / deleted)
    const { GET } = await import("@/app/api/public/shop/products/[id]/reviews/route")
    const res = await GET(req(`${PATH}?companySlug=prv`))
    expect(res.status).toBe(404)
    expect((await res.json()).reason).toBe("unknown_product")
  })

  it("returns summary + reviews with the author reduced to first name and initial", async () => {
    queue.push([{ id: "co-1" }]) // company
    queue.push([{ id: "prod-1" }]) // product
    queue.push([{ totalCount: 2, avgRating: "4.75" }]) // totals
    queue.push([
      {
        id: "r1",
        rating: 5,
        title: "Exact ca în poze",
        body: "Nuanța e identică.",
        authorName: "Andrei Popescu",
        isVerifiedPurchase: true,
        createdAt: new Date("2026-07-12T10:00:00Z"),
      },
      {
        id: "r2",
        rating: 4,
        title: null,
        body: null,
        authorName: "Ioana",
        isVerifiedPurchase: false,
        createdAt: new Date("2026-06-28T10:00:00Z"),
      },
    ])
    const { GET } = await import("@/app/api/public/shop/products/[id]/reviews/route")
    const body = await (await GET(req(`${PATH}?companySlug=prv`))).json()
    expect(body.summary).toEqual({ totalCount: 2, avgRating: 4.8 })
    expect(body.reviews.map((r: { author: string | null }) => r.author)).toEqual([
      "Andrei P.",
      "Ioana",
    ])
    expect(body.hasMore).toBe(false)
    expect(body.nextCursor).toBeNull()
  })

  it("paginates by cursor: limit+1 fetch → hasMore + nextCursor", async () => {
    queue.push([{ id: "co-1" }])
    queue.push([{ id: "prod-1" }])
    queue.push([{ totalCount: 5, avgRating: "4" }])
    queue.push([
      {
        id: "r1",
        rating: 4,
        title: null,
        body: null,
        authorName: null,
        isVerifiedPurchase: false,
        createdAt: new Date("2026-07-12T10:00:00Z"),
      },
      {
        id: "r2",
        rating: 4,
        title: null,
        body: null,
        authorName: null,
        isVerifiedPurchase: false,
        createdAt: new Date("2026-07-11T10:00:00Z"),
      },
    ])
    const { GET } = await import("@/app/api/public/shop/products/[id]/reviews/route")
    const body = await (await GET(req(`${PATH}?companySlug=prv&limit=1`))).json()
    expect(body.reviews).toHaveLength(1)
    expect(body.hasMore).toBe(true)
    expect(body.nextCursor).toBe("2026-07-12T10:00:00.000Z")
  })
})
