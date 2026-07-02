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
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { promotions: col() }
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
    "orderBy",
    "limit",
    "insert",
    "values",
    "returning",
  ] as const)
    mockDb[m].mockReturnThis()
}

const activePromo = {
  id: "pr1",
  name: "Spring",
  description: null,
  type: "percentage",
  scope: "order",
  value: "15",
  minSubtotal: "200",
  code: "SPRING15",
  status: "active",
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  usageCount: 42,
  perCustomerLimit: null,
  stackable: false,
  autoApply: false,
}

describe("promotions routes", () => {
  beforeEach(reset)

  it("GET flags redeemable + summarizes", async () => {
    queue.push([activePromo, { ...activePromo, id: "pr2", status: "draft", code: "OLD" }])
    const { GET } = await import("@/app/api/shop/promotions/route")
    const res = await GET(rq("/api/shop/promotions"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.promotions.find((p: { id: string }) => p.id === "pr1").redeemable).toBe(true)
    expect(body.meta).toMatchObject({ total: 2, active: 1, redeemable: 1 })
  })

  it("POST creates, rejects >100% and blank name", async () => {
    queue.push([{ id: "pr-new" }])
    const { POST } = await import("@/app/api/shop/promotions/route")
    const ok = await POST(
      rq("/api/shop/promotions", "POST", { name: "Sale", type: "percentage", value: 15 }),
      ctx
    )
    expect(ok.status).toBe(201)
    expect(auditSpy).toHaveBeenCalledTimes(1)

    reset()
    const { POST: P2 } = await import("@/app/api/shop/promotions/route")
    expect(
      (
        await P2(
          rq("/api/shop/promotions", "POST", { name: "X", type: "percentage", value: 150 }),
          ctx
        )
      ).status
    ).toBe(422)
    expect((await P2(rq("/api/shop/promotions", "POST", { name: "", value: 5 }), ctx)).status).toBe(
      422
    )
  })

  it("validate returns the discount for a good code and rejects otherwise", async () => {
    queue.push([activePromo]) // found + active + min 200
    const { POST } = await import("@/app/api/shop/promotions/validate/route")
    const ok = await POST(
      rq("/api/shop/promotions/validate", "POST", { code: "SPRING15", subtotal: 300 }),
      ctx
    )
    const okBody = await ok.json()
    expect(okBody).toMatchObject({ valid: true, discount: 45 })

    reset()
    queue.push([activePromo]) // below min
    const { POST: P2 } = await import("@/app/api/shop/promotions/validate/route")
    const low = await P2(
      rq("/api/shop/promotions/validate", "POST", { code: "SPRING15", subtotal: 100 }),
      ctx
    )
    expect((await low.json()).valid).toBe(false)

    reset()
    queue.push([]) // unknown code
    const { POST: P3 } = await import("@/app/api/shop/promotions/validate/route")
    const miss = await P3(
      rq("/api/shop/promotions/validate", "POST", { code: "NOPE", subtotal: 300 }),
      ctx
    )
    expect((await miss.json()).valid).toBe(false)
  })
})
