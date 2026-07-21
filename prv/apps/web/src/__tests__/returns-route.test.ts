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
  for (const t of ["orderReturns", "orderReturnItems", "orders", "notifications"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), desc: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "actor-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const ORDER = "22222222-2222-2222-2222-222222222222"
const RETURN = "33333333-3333-3333-3333-333333333333"

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
    "returning",
    "update",
    "set",
    "delete",
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("shop returns register (GET)", () => {
  beforeEach(reset)

  it("returns the register with a computed summary", async () => {
    const now = new Date("2026-07-01T00:00:00Z")
    queue.push([
      {
        id: "r1",
        returnNumber: "RET-A",
        orderId: ORDER,
        reason: "damaged",
        status: "refunded",
        refundAmount: "25.00",
        restock: true,
        createdAt: now,
        orderNumber: "ORD-1",
      },
      {
        id: "r2",
        returnNumber: "RET-B",
        orderId: ORDER,
        reason: "other",
        status: "requested",
        refundAmount: "10.00",
        restock: false,
        createdAt: now,
        orderNumber: "ORD-2",
      },
    ])
    const { GET } = await import("@/app/api/shop/returns/route")
    const res = await GET(rq("/api/shop/returns"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.returns).toHaveLength(2)
    expect(body.meta.total).toBe(2)
    expect(body.meta.open).toBe(1) // requested is open
    expect(body.meta.refunded).toBe(1)
    expect(body.meta.totalRefunded).toBe(25)
  })
})

describe("create return (POST orders/[id]/returns)", () => {
  beforeEach(reset)

  it("creates a return, computes the refund, inserts items and audits", async () => {
    queue.push([{ id: ORDER }]) // order lookup
    queue.push([{ id: RETURN }]) // insert orderReturns returning
    queue.push([]) // insert orderReturnItems
    const { POST } = await import("@/app/api/shop/orders/[id]/returns/route")
    const res = await POST(
      rq(`/api/shop/orders/${ORDER}/returns`, "POST", {
        reason: "damaged",
        items: [
          { name: "Tile box", quantity: 2, unitPrice: 9.99 },
          { name: "Grout", quantity: 1, unitPrice: 5.5 },
        ],
      }),
      ctx
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe(RETURN)
    expect(body.refund).toBe(25.48)
    expect(mockDb.insert).toHaveBeenCalledTimes(2) // return + items
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("404s when the order is not in the company", async () => {
    queue.push([]) // order lookup → none
    const { POST } = await import("@/app/api/shop/orders/[id]/returns/route")
    const res = await POST(
      rq(`/api/shop/orders/${ORDER}/returns`, "POST", {
        items: [{ name: "x", quantity: 1, unitPrice: 1 }],
      }),
      ctx
    )
    expect(res.status).toBe(404)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("422s on an empty item list", async () => {
    queue.push([{ id: ORDER }]) // order lookup
    const { POST } = await import("@/app/api/shop/orders/[id]/returns/route")
    const res = await POST(rq(`/api/shop/orders/${ORDER}/returns`, "POST", { items: [] }), ctx)
    expect(res.status).toBe(422)
  })
})

describe("advance return (PATCH returns/[id])", () => {
  beforeEach(reset)

  it("advances through a valid transition and audits", async () => {
    queue.push([{ status: "requested", createdById: "creator-1", returnNumber: "RET-9" }]) // current
    queue.push([{ id: RETURN, status: "approved" }]) // update returning
    const { PATCH } = await import("@/app/api/shop/returns/[id]/route")
    const res = await PATCH(rq(`/api/shop/returns/${RETURN}`, "PATCH", { status: "approved" }), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("approved")
    expect(auditSpy).toHaveBeenCalledTimes(1)
    // Notifies the return's creator of the decision.
    expect(mockDb.insert).toHaveBeenCalledTimes(1)
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "creator-1", entityType: "order_return" })
    )
  })

  it("does not notify when the actor is the return's own creator", async () => {
    queue.push([{ status: "requested", createdById: "actor-1", returnNumber: "RET-9" }]) // current
    queue.push([{ id: RETURN, status: "approved" }]) // update returning
    const { PATCH } = await import("@/app/api/shop/returns/[id]/route")
    const res = await PATCH(rq(`/api/shop/returns/${RETURN}`, "PATCH", { status: "approved" }), ctx)
    expect(res.status).toBe(200)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("409s with INVALID_TRANSITION on an illegal jump", async () => {
    queue.push([{ status: "requested" }]) // current
    const { PATCH } = await import("@/app/api/shop/returns/[id]/route")
    const res = await PATCH(rq(`/api/shop/returns/${RETURN}`, "PATCH", { status: "refunded" }), ctx)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe("INVALID_TRANSITION")
    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it("404s when the return is missing", async () => {
    queue.push([]) // current → none
    const { PATCH } = await import("@/app/api/shop/returns/[id]/route")
    const res = await PATCH(rq(`/api/shop/returns/${RETURN}`, "PATCH", { status: "approved" }), ctx)
    expect(res.status).toBe(404)
  })
})
