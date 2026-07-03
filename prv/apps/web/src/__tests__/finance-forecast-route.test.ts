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
  where: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["invoices", "expenses", "clients"]) mod[t] = col()
  return mod
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, and: vi.fn(), eq: vi.fn(), gte: vi.fn(), inArray: vi.fn(), isNull: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "actor-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
function rq() {
  return {
    method: "GET",
    url: "http://localhost/api/finance/forecast",
    nextUrl: { pathname: "/api/finance/forecast", searchParams: new URLSearchParams() },
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "where"] as const) mockDb[m].mockReturnThis()
}

describe("GET /api/finance/forecast", () => {
  beforeEach(reset)

  it("derives run rates + weighted pipeline and projects 3/6/12-month horizons", async () => {
    // Promise.all order: paidInvoices, recentExpenses, leadRows
    queue.push([{ total: "30000.00", paidAt: new Date() }]) // 30000 over 3 months = 10000/mo
    queue.push([
      { amount: "12000.00", date: "2026-06-01" },
      { amount: "12000.00", date: "2026-06-15" },
    ]) // 24000 over 3 months = 8000/mo
    queue.push([
      {
        metadata: { stage: "negotiation", source: "referral", estimatedValue: 10000 },
        createdAt: new Date("2026-06-01"),
        updatedAt: new Date("2026-06-10"),
      },
    ]) // weighted = 10000 * 0.8 = 8000

    const { GET } = await import("@/app/api/finance/forecast/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.assumptions.monthlyRevenueRunRate).toBe(10000)
    expect(body.assumptions.monthlyExpenseRunRate).toBe(8000)
    expect(body.assumptions.weightedPipelineTotal).toBe(8000)

    // horizons present with correct lengths
    expect(body.horizons["3"]).toHaveLength(3)
    expect(body.horizons["12"]).toHaveLength(12)
    // M1 revenue = (10000 + 8000/3) base ≈ 12666.67
    expect(body.horizons["6"][0].revenue).toBeCloseTo(12666.67, 1)
    // profitable → break-even month 1
    expect(body.breakEvenMonth).toBe(1)
    // three scenarios
    expect(body.scenarios["6"].map((s: { scenario: string }) => s.scenario)).toEqual([
      "conservative",
      "base",
      "optimistic",
    ])
  })

  it("handles an empty company with zeroed assumptions", async () => {
    queue.push([]) // no invoices
    queue.push([]) // no expenses
    queue.push([]) // no leads
    const { GET } = await import("@/app/api/finance/forecast/route")
    const res = await GET(rq(), ctx)
    const body = await res.json()
    expect(body.assumptions.monthlyRevenueRunRate).toBe(0)
    expect(body.assumptions.weightedPipelineTotal).toBe(0)
    expect(body.breakEvenMonth).toBe(1) // net 0 → cumulative 0 ≥ 0 at M1
  })
})
