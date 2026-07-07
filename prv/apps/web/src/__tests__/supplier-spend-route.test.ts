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
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn((..._a: unknown[]) => Promise.resolve(nextResult())),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { supplierInvoices: col(), suppliers: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "user-9", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/analytics/supplier-spend",
    nextUrl: { pathname: "/api/analytics/supplier-spend" },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "leftJoin"] as const) mockDb[m].mockReturnThis()
  mockDb.where.mockImplementation(() => Promise.resolve(nextResult()))
}

describe("GET /api/analytics/supplier-spend", () => {
  beforeEach(reset)

  it("aggregates the supplier-invoice ledger into spend and payables", async () => {
    const day = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10)
    queue.push([
      {
        supplierId: "a",
        status: "paid",
        dueDate: day(-10),
        amount: "1000",
        paidAmount: "1000",
        supplierName: "Acme",
      },
      {
        supplierId: "a",
        status: "received",
        dueDate: day(-3),
        amount: "500",
        paidAmount: "0",
        supplierName: "Acme",
      },
      {
        supplierId: "b",
        status: "scheduled",
        dueDate: day(10),
        amount: "2000",
        paidAmount: "0",
        supplierName: "Globex",
      },
      {
        supplierId: "a",
        status: "cancelled",
        dueDate: day(-3),
        amount: "9999",
        paidAmount: "0",
        supplierName: "Acme",
      },
    ])
    const { GET } = await import("@/app/api/analytics/supplier-spend/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalSpend).toBe(3500) // 1000 + 500 + 2000 (cancelled excluded)
    expect(body.totalOutstanding).toBe(2500) // 500 + 2000
    expect(body.totalOverdue).toBe(500) // only Acme's overdue received
    expect(body.overdueSuppliers).toBe(1)
    // ranked by spend: Globex(2000) then Acme(1500)
    expect(body.suppliers[0].name).toBe("Globex")
    const acme = body.suppliers.find((s: { supplierId: string }) => s.supplierId === "a")
    expect(acme.overdueAmount).toBe(500)
  })

  it("handles an empty ledger", async () => {
    queue.push([])
    const { GET } = await import("@/app/api/analytics/supplier-spend/route")
    const body = await (await GET(rq(), ctx)).json()
    expect(body.totalSpend).toBe(0)
    expect(body.supplierCount).toBe(0)
  })
})
