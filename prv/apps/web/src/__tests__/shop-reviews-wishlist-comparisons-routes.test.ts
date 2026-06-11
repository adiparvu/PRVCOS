import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
  RoleSets: { admin: [], management: [] },
  hasScope: vi.fn().mockReturnValue(true),
}))

const mockDb = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  values: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  onConflictDoNothing: vi.fn().mockReturnThis(),
}

vi.mock("@prv/db", () => ({ db: mockDb }))

vi.mock("@prv/db/schema", () => ({
  productReviews: {},
  productWishlistItems: {},
  productComparisons: {},
  products: {},
  productCategories: {},
}))

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    isNull: vi.fn(),
    desc: vi.fn(),
    lt: vi.fn(),
  }
})

const webCtx = {
  session: {
    companyId: "company-1",
    userId: "user-1",
    sessionId: "session-1",
    role: "admin",
    scopeLevel: 9,
  },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}

function makeReq(
  path: string,
  method = "GET",
  body: Record<string, unknown> = {},
  searchParams: Record<string, string> = {}
): Request {
  const url = new URL(`http://localhost${path}`)
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  return {
    method,
    url: url.toString(),
    headers: { get: () => null },
    json: async () => body,
    signal: { addEventListener: vi.fn() },
  } as unknown as Request
}

function resetMocks() {
  vi.clearAllMocks()
  mockDb.select.mockReturnThis()
  mockDb.insert.mockReturnThis()
  mockDb.update.mockReturnThis()
  mockDb.delete.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
  mockDb.limit.mockResolvedValue([])
  mockDb.values.mockReturnThis()
  mockDb.innerJoin.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
  mockDb.returning.mockResolvedValue([])
  mockDb.onConflictDoNothing.mockReturnThis()
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

describe("GET /api/shop/reviews", () => {
  beforeEach(resetMocks)

  it("returns empty reviews list when no rows", async () => {
    const { GET } = await import("@/app/api/shop/reviews/route")
    const res = await GET(makeReq("/api/shop/reviews"), webCtx as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.reviews).toEqual([])
    expect(data.count).toBe(0)
    expect(data.avgRating).toBeNull()
  })

  it("maps review rows and calculates avgRating", async () => {
    const now = new Date()
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "rev-1",
        productId: "prod-1",
        rating: 4,
        title: "Great",
        body: "Very good",
        authorName: "Alice",
        isVerifiedPurchase: true,
        helpfulCount: 2,
        createdAt: now,
      },
      {
        id: "rev-2",
        productId: "prod-1",
        rating: 5,
        title: null,
        body: null,
        authorName: null,
        isVerifiedPurchase: false,
        helpfulCount: 0,
        createdAt: now,
      },
    ])

    const { GET } = await import("@/app/api/shop/reviews/route")
    const res = await GET(makeReq("/api/shop/reviews"), webCtx as never)
    const data = await res.json()

    expect(data.reviews).toHaveLength(2)
    expect(data.avgRating).toBe(4.5)
  })

  it("passes pagination cursor as createdAt filter", async () => {
    const { GET } = await import("@/app/api/shop/reviews/route")
    await GET(
      makeReq("/api/shop/reviews", "GET", {}, { cursor: new Date().toISOString() }),
      webCtx as never
    )
    // lt() operator is called for cursor pagination
    const { lt } = await import("drizzle-orm")
    expect(lt).toHaveBeenCalled()
  })
})

describe("POST /api/shop/reviews", () => {
  beforeEach(resetMocks)

  it("returns 400 when productId is missing", async () => {
    const { POST } = await import("@/app/api/shop/reviews/route")
    const res = await POST(makeReq("/api/shop/reviews", "POST", { rating: 4 }), webCtx as never)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/productId/)
  })

  it("returns 400 when rating is out of range", async () => {
    const { POST } = await import("@/app/api/shop/reviews/route")
    const res = await POST(
      makeReq("/api/shop/reviews", "POST", { productId: "prod-1", rating: 6 }),
      webCtx as never
    )
    expect(res.status).toBe(400)
  })

  it("creates review and returns 201", async () => {
    const inserted = {
      id: "rev-new",
      productId: "prod-1",
      rating: 5,
      title: "Great",
      body: "Excellent",
      authorName: "Bob",
      isVerifiedPurchase: false,
      helpfulCount: 0,
      createdAt: new Date(),
    }
    mockDb.returning.mockResolvedValueOnce([inserted])

    const { POST } = await import("@/app/api/shop/reviews/route")
    const res = await POST(
      makeReq("/api/shop/reviews", "POST", {
        productId: "prod-1",
        rating: 5,
        title: "Great",
        reviewBody: "Excellent",
        authorName: "Bob",
      }),
      webCtx as never
    )

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.review.id).toBe("rev-new")
    expect(data.review.rating).toBe(5)

    const { writeAuditLog } = await import("@prv/auth")
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "shop.reviews.create", entityType: "product_review" })
    )
  })
})

// ─── Wishlist ─────────────────────────────────────────────────────────────────

describe("GET /api/shop/wishlist", () => {
  beforeEach(resetMocks)

  it("returns empty wishlist", async () => {
    const { GET } = await import("@/app/api/shop/wishlist/route")
    const res = await GET(makeReq("/api/shop/wishlist"), webCtx as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.items).toEqual([])
    expect(data.count).toBe(0)
  })

  it("maps joined wishlist rows", async () => {
    const now = new Date()
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "wl-1",
        productId: "prod-1",
        notes: null,
        addedAt: now,
        productName: "Gresie 60x60",
        productSku: "GRS-001",
        price: "125.00",
        unit: "mp",
        categorySlug: "pardoseli",
      },
    ])

    const { GET } = await import("@/app/api/shop/wishlist/route")
    const res = await GET(makeReq("/api/shop/wishlist"), webCtx as never)
    const data = await res.json()

    expect(data.items).toHaveLength(1)
    expect(data.items[0].price).toBe(125)
    expect(data.items[0].category).toBe("pardoseli")
  })
})

describe("POST /api/shop/wishlist", () => {
  beforeEach(resetMocks)

  it("returns 400 when productId is missing", async () => {
    const { POST } = await import("@/app/api/shop/wishlist/route")
    const res = await POST(makeReq("/api/shop/wishlist", "POST", {}), webCtx as never)
    expect(res.status).toBe(400)
  })

  it("returns added:true on success", async () => {
    mockDb.returning.mockResolvedValueOnce([{ id: "wl-new" }])

    const { POST } = await import("@/app/api/shop/wishlist/route")
    const res = await POST(
      makeReq("/api/shop/wishlist", "POST", { productId: "prod-1" }),
      webCtx as never
    )

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.added).toBe(true)
    expect(data.id).toBe("wl-new")
  })

  it("returns added:false when already in wishlist (conflict)", async () => {
    mockDb.returning.mockResolvedValueOnce([]) // onConflictDoNothing returns empty

    const { POST } = await import("@/app/api/shop/wishlist/route")
    const res = await POST(
      makeReq("/api/shop/wishlist", "POST", { productId: "prod-1" }),
      webCtx as never
    )

    const data = await res.json()
    expect(data.added).toBe(false)
    expect(data.reason).toBe("already_in_wishlist")
  })
})

describe("DELETE /api/shop/wishlist", () => {
  beforeEach(resetMocks)

  it("returns 400 when productId is missing", async () => {
    const { DELETE } = await import("@/app/api/shop/wishlist/route")
    const res = await DELETE(makeReq("/api/shop/wishlist", "DELETE", {}), webCtx as never)
    expect(res.status).toBe(400)
  })

  it("returns removed:true on successful deletion", async () => {
    const { DELETE } = await import("@/app/api/shop/wishlist/route")
    const res = await DELETE(
      makeReq("/api/shop/wishlist", "DELETE", { productId: "prod-1" }),
      webCtx as never
    )
    const data = await res.json()
    expect(data.removed).toBe(true)
  })
})

// ─── Comparisons ──────────────────────────────────────────────────────────────

describe("GET /api/shop/comparisons", () => {
  beforeEach(resetMocks)

  it("returns empty comparison list with max:4", async () => {
    const { GET } = await import("@/app/api/shop/comparisons/route")
    const res = await GET(makeReq("/api/shop/comparisons"), webCtx as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.items).toEqual([])
    expect(data.max).toBe(4)
  })
})

describe("POST /api/shop/comparisons", () => {
  beforeEach(resetMocks)

  it("returns 400 when productId is missing", async () => {
    const { POST } = await import("@/app/api/shop/comparisons/route")
    const res = await POST(makeReq("/api/shop/comparisons", "POST", {}), webCtx as never)
    expect(res.status).toBe(400)
  })

  it("returns 422 when comparison limit is reached", async () => {
    // 4 existing items → limit reached (limit check uses .limit() as terminal)
    mockDb.limit.mockResolvedValueOnce([{ id: "c1" }, { id: "c2" }, { id: "c3" }, { id: "c4" }])

    const { POST } = await import("@/app/api/shop/comparisons/route")
    const res = await POST(
      makeReq("/api/shop/comparisons", "POST", { productId: "prod-5" }),
      webCtx as never
    )

    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.error).toBe("comparison_limit_reached")
    expect(data.max).toBe(4)
  })

  it("adds product to comparison when under limit", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "c1" }, { id: "c2" }])
    mockDb.returning.mockResolvedValueOnce([{ id: "cmp-new" }])

    const { POST } = await import("@/app/api/shop/comparisons/route")
    const res = await POST(
      makeReq("/api/shop/comparisons", "POST", { productId: "prod-3" }),
      webCtx as never
    )

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.added).toBe(true)
    expect(data.id).toBe("cmp-new")
  })
})

describe("DELETE /api/shop/comparisons", () => {
  beforeEach(resetMocks)

  it("returns 400 when productId is missing", async () => {
    const { DELETE } = await import("@/app/api/shop/comparisons/route")
    const res = await DELETE(makeReq("/api/shop/comparisons", "DELETE", {}), webCtx as never)
    expect(res.status).toBe(400)
  })

  it("returns removed:true", async () => {
    const { DELETE } = await import("@/app/api/shop/comparisons/route")
    const res = await DELETE(
      makeReq("/api/shop/comparisons", "DELETE", { productId: "prod-1" }),
      webCtx as never
    )
    const data = await res.json()
    expect(data.removed).toBe(true)
  })
})
