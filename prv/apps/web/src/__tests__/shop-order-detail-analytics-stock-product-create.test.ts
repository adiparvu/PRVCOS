import { describe, it, expect, vi, beforeEach } from "vitest"
import { queryShopOrderSummary, queryTopProducts, queryLowStockProducts } from "@prv/db"

const mockDb = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
}))

vi.mock("@/lib/with-gates", () => ({
  withGates: (_opts: unknown, handler: unknown) => handler,
}))

vi.mock("@prv/auth", () => ({
  writeAuditLog: vi.fn(),
  RoleSets: { admin: [], management: [] },
  hasScope: vi.fn().mockReturnValue(true),
}))

vi.mock("@prv/db", () => ({
  db: mockDb,
  queryShopOrderSummary: vi.fn(),
  queryTopProducts: vi.fn(),
  queryLowStockProducts: vi.fn(),
}))

vi.mock("@prv/db/schema", () => ({
  orders: {},
  orderItems: {},
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
    lt: vi.fn(),
    desc: vi.fn(),
    sql: vi.fn().mockReturnValue({}),
    ne: vi.fn(),
    gte: vi.fn(),
    inArray: vi.fn(),
  }
})

vi.mock("@prv/cache", () => ({
  appendRealtimeEvent: vi.fn().mockResolvedValue(undefined),
  realtimeChannel: { shop: (id: string) => `shop:${id}` },
  REALTIME_EVENT: { SHOP_UPDATE: "shop.update" },
}))

vi.mock("@prv/jobs/client", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock("zod", async (importOriginal) => {
  return await importOriginal()
})

const ctx = {
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

function makeReq(path: string, method = "GET", body: Record<string, unknown> = {}): Request {
  return {
    method,
    url: `http://localhost${path}`,
    nextUrl: { pathname: path },
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
  mockDb.set.mockReturnThis()
  mockDb.returning.mockResolvedValue([])
  mockDb.innerJoin.mockReturnThis()
  mockDb.leftJoin.mockReturnThis()
  mockDb.groupBy.mockReturnThis()
  mockDb.orderBy.mockReturnThis()
}

// ─── GET /api/shop/orders/[id] ────────────────────────────────────────────────

describe("GET /api/shop/orders/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when order not found", async () => {
    mockDb.limit.mockResolvedValueOnce([]) // order select
    const { GET } = await import("@/app/api/shop/orders/[id]/route")
    const res = await GET(makeReq("/api/shop/orders/ord-1"), ctx as never)
    expect(res.status).toBe(404)
  })

  it("returns order with items on success", async () => {
    const now = new Date("2025-01-01T10:00:00.000Z")
    mockDb.limit.mockResolvedValueOnce([
      {
        id: "ord-1",
        orderNumber: "CMD-001",
        status: "pending",
        subtotal: "100",
        vatAmount: "19",
        total: "119",
        shippingAddress: { street: "Str. Test 1", city: "Bucharest" },
        notes: "fragile",
        createdAt: now,
        updatedAt: now,
      },
    ])
    // line items query
    mockDb.limit.mockResolvedValueOnce([])

    const { GET } = await import("@/app/api/shop/orders/[id]/route")
    const res = await GET(makeReq("/api/shop/orders/ord-1"), ctx as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.order.id).toBe("ord-1")
    expect(data.order.ref).toBe("CMD-001")
    expect(data.order.status).toBe("pending")
    expect(data.order.deliveryAddress).toBe("Str. Test 1, Bucharest")
  })
})

// ─── PATCH /api/shop/orders/[id] ─────────────────────────────────────────────

describe("PATCH /api/shop/orders/[id] (status update)", () => {
  beforeEach(resetMocks)

  it("returns 404 when order not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])
    const { PATCH } = await import("@/app/api/shop/orders/[id]/route")
    const res = await PATCH(
      makeReq("/api/shop/orders/ord-1", "PATCH", { status: "confirmed" }),
      ctx as never
    )
    expect(res.status).toBe(404)
  })

  it("transitions pending → confirmed and returns 200", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "ord-1", status: "pending", orderNumber: "CMD-001" }])
    mockDb.returning.mockResolvedValueOnce([
      { id: "ord-1", status: "confirmed", orderNumber: "CMD-001" },
    ])

    const { PATCH } = await import("@/app/api/shop/orders/[id]/route")
    const res = await PATCH(
      makeReq("/api/shop/orders/ord-1", "PATCH", { status: "confirmed" }),
      ctx as never
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe("confirmed")
  })

  it("rejects invalid transition confirmed → delivered (skips processing/shipped)", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "ord-1", status: "confirmed", orderNumber: "CMD-001" },
    ])

    const { PATCH } = await import("@/app/api/shop/orders/[id]/route")
    const res = await PATCH(
      makeReq("/api/shop/orders/ord-1", "PATCH", { status: "delivered" }),
      ctx as never
    )
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toMatch(/Cannot transition/)
  })

  it("returns 400 when status is missing", async () => {
    const { PATCH } = await import("@/app/api/shop/orders/[id]/route")
    const res = await PATCH(makeReq("/api/shop/orders/ord-1", "PATCH", {}), ctx as never)
    expect(res.status).toBe(400)
  })

  it("fires audit log on successful transition", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "ord-1", status: "pending", orderNumber: "CMD-001" }])
    mockDb.returning.mockResolvedValueOnce([
      { id: "ord-1", status: "confirmed", orderNumber: "CMD-001" },
    ])

    const { PATCH } = await import("@/app/api/shop/orders/[id]/route")
    await PATCH(makeReq("/api/shop/orders/ord-1", "PATCH", { status: "confirmed" }), ctx as never)

    const { writeAuditLog } = await import("@prv/auth")
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "shop.orders.status_update" })
    )
  })
})

// ─── DELETE /api/shop/orders/[id] ────────────────────────────────────────────

describe("DELETE /api/shop/orders/[id]", () => {
  beforeEach(resetMocks)

  it("returns 404 when order not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])
    const { DELETE } = await import("@/app/api/shop/orders/[id]/route")
    const res = await DELETE(makeReq("/api/shop/orders/ord-1", "DELETE"), ctx as never)
    expect(res.status).toBe(404)
  })

  it("returns 409 when order is not cancelled/refunded", async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: "ord-1", status: "pending", orderNumber: "CMD-001" }])
    const { DELETE } = await import("@/app/api/shop/orders/[id]/route")
    const res = await DELETE(makeReq("/api/shop/orders/ord-1", "DELETE"), ctx as never)
    expect(res.status).toBe(409)
  })

  it("soft-deletes a cancelled order and returns 204", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "ord-1", status: "cancelled", orderNumber: "CMD-001" },
    ])

    const { DELETE } = await import("@/app/api/shop/orders/[id]/route")
    const res = await DELETE(makeReq("/api/shop/orders/ord-1", "DELETE"), ctx as never)
    expect(res.status).toBe(204)
  })
})

// ─── GET /api/shop/analytics ─────────────────────────────────────────────────

describe("GET /api/shop/analytics", () => {
  beforeEach(() => {
    resetMocks()
    vi.mocked(queryShopOrderSummary).mockResolvedValue({
      totalOrders: 42,
      pendingOrders: 5,
      processingOrders: 10,
      shippedOrders: 8,
      deliveredOrders: 16,
      cancelledOrders: 3,
      totalRevenue: "12345.67",
      periodKey: "2025-01",
    })
    vi.mocked(queryTopProducts).mockResolvedValue([
      {
        productId: "p-1",
        productName: "Vopsea Alb",
        categoryId: null,
        totalSold: 30,
        totalRevenue: "900",
      },
    ])
    vi.mocked(queryLowStockProducts).mockResolvedValue([
      {
        id: "p-2",
        name: "Gresie",
        sku: "GRS-01",
        stockQuantity: 2,
        stockMinimum: 5,
        categoryId: null,
      },
    ])
  })

  it("returns orderSummary, topProducts, and lowStock", async () => {
    const { GET } = await import("@/app/api/shop/analytics/route")
    const res = await GET(makeReq("/api/shop/analytics"), ctx as never)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.orderSummary.totalOrders).toBe(42)
    expect(data.topProducts).toHaveLength(1)
    expect(data.lowStock.count).toBe(1)
    expect(data.lowStock.products[0].name).toBe("Gresie")
  })
})

// ─── PATCH /api/shop/products/[id]/stock ─────────────────────────────────────

describe("PATCH /api/shop/products/[id]/stock", () => {
  beforeEach(resetMocks)

  it("returns 404 when product not found", async () => {
    mockDb.limit.mockResolvedValueOnce([])
    const { PATCH } = await import("@/app/api/shop/products/[id]/stock/route")
    const res = await PATCH(
      makeReq("/api/shop/products/prod-1/stock", "PATCH", { adjustment: 10 }),
      ctx as never
    )
    expect(res.status).toBe(404)
  })

  it("returns 400 when adjustment is missing", async () => {
    const { PATCH } = await import("@/app/api/shop/products/[id]/stock/route")
    const res = await PATCH(makeReq("/api/shop/products/prod-1/stock", "PATCH", {}), ctx as never)
    expect(res.status).toBe(400)
  })

  it("returns 422 when adjustment would result in negative stock", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "prod-1", name: "Vopsea", stockQuantity: 3, stockMinimum: 0 },
    ])
    const { PATCH } = await import("@/app/api/shop/products/[id]/stock/route")
    const res = await PATCH(
      makeReq("/api/shop/products/prod-1/stock", "PATCH", { adjustment: -10 }),
      ctx as never
    )
    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.error).toMatch(/negative stock/)
  })

  it("applies positive adjustment and returns new stock", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "prod-1", name: "Vopsea", stockQuantity: 5, stockMinimum: 2 },
    ])
    mockDb.returning.mockResolvedValueOnce([{ id: "prod-1", stockQuantity: 15, stockMinimum: 2 }])

    const { PATCH } = await import("@/app/api/shop/products/[id]/stock/route")
    const res = await PATCH(
      makeReq("/api/shop/products/prod-1/stock", "PATCH", { adjustment: 10, reason: "restock" }),
      ctx as never
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.stockQuantity).toBe(15)
    expect(data.adjustment).toBe(10)
  })

  it("fires audit log with before/after values", async () => {
    mockDb.limit.mockResolvedValueOnce([
      { id: "prod-1", name: "Vopsea", stockQuantity: 5, stockMinimum: 2 },
    ])
    mockDb.returning.mockResolvedValueOnce([{ id: "prod-1", stockQuantity: 3, stockMinimum: 2 }])

    const { PATCH } = await import("@/app/api/shop/products/[id]/stock/route")
    await PATCH(
      makeReq("/api/shop/products/prod-1/stock", "PATCH", { adjustment: -2 }),
      ctx as never
    )

    const { writeAuditLog } = await import("@prv/auth")
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "shop.products.stock_adjust",
        payload: expect.objectContaining({ before: 5, adjustment: -2, after: 3 }),
      })
    )
  })
})

// ─── POST /api/shop/products ──────────────────────────────────────────────────

describe("POST /api/shop/products", () => {
  beforeEach(resetMocks)

  it("returns 422 for missing name", async () => {
    const { POST } = await import("@/app/api/shop/products/route")
    const res = await POST(makeReq("/api/shop/products", "POST", { price: 100 }), ctx as never)
    expect(res.status).toBe(422)
  })

  it("returns 422 for negative price", async () => {
    const { POST } = await import("@/app/api/shop/products/route")
    const res = await POST(
      makeReq("/api/shop/products", "POST", { name: "Test", price: -5 }),
      ctx as never
    )
    expect(res.status).toBe(422)
  })

  it("creates product and returns 201", async () => {
    const now = new Date()
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "prod-new",
        sku: "SKU-001",
        name: "Vopsea Alba",
        price: "50.00",
        unit: "kg",
        stockQuantity: 10,
        stockMinimum: 2,
        description: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const { POST } = await import("@/app/api/shop/products/route")
    const res = await POST(
      makeReq("/api/shop/products", "POST", {
        name: "Vopsea Alba",
        price: 50,
        unit: "kg",
        sku: "SKU-001",
        stockQuantity: 10,
        stockMinimum: 2,
      }),
      ctx as never
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.product.id).toBe("prod-new")
    expect(data.product.name).toBe("Vopsea Alba")
    expect(data.product.price).toBe(50)
  })

  it("fires audit log with action shop.products.create", async () => {
    const now = new Date()
    mockDb.returning.mockResolvedValueOnce([
      {
        id: "prod-new",
        sku: null,
        name: "Prod",
        price: "10",
        unit: "buc",
        stockQuantity: 0,
        stockMinimum: 0,
        description: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const { POST } = await import("@/app/api/shop/products/route")
    await POST(makeReq("/api/shop/products", "POST", { name: "Prod", price: 10 }), ctx as never)

    const { writeAuditLog } = await import("@prv/auth")
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "shop.products.create" })
    )
  })
})
