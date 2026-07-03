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
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["supplierInvoices", "suppliers"]) mod[t] = col()
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
const PAY = "44444444-4444-4444-4444-444444444444"
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
  ] as const)
    mockDb[m].mockReturnThis()
}

describe("payables register (GET)", () => {
  beforeEach(reset)

  it("returns aging, outflow and per-row outstanding with an overdue flag", async () => {
    queue.push([
      {
        id: "p1",
        invoiceNumber: "BRC-1",
        supplierId: "s1",
        supplierName: "Brico",
        status: "received",
        issueDate: "2026-06-01",
        dueDate: "2020-01-01", // long overdue
        scheduledDate: null,
        paidDate: null,
        amount: "1000.00",
        taxAmount: "0.00",
        paidAmount: "0.00",
        currency: "RON",
        createdAt: new Date("2026-06-01"),
      },
      {
        id: "p2",
        invoiceNumber: "DED-1",
        supplierId: "s2",
        supplierName: "Dedeman",
        status: "received",
        issueDate: null,
        dueDate: "2100-01-01", // future
        scheduledDate: null,
        paidDate: null,
        amount: "500.00",
        taxAmount: "95.00",
        paidAmount: "0.00",
        currency: "RON",
        createdAt: new Date("2026-06-01"),
      },
    ])
    const { GET } = await import("@/app/api/finance/payables/route")
    const res = await GET(rq("/api/finance/payables"), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.payables).toHaveLength(2)
    expect(body.aging.totalOutstanding).toBe(1595)
    expect(body.aging.overdueTotal).toBe(1000)
    const overdueRow = body.payables.find((r: { id: string }) => r.id === "p1")
    expect(overdueRow.overdue).toBe(true)
    expect(overdueRow.outstanding).toBe(1000)
    const futureRow = body.payables.find((r: { id: string }) => r.id === "p2")
    expect(futureRow.overdue).toBe(false)
    expect(futureRow.outstanding).toBe(595)
  })

  it("POST records a payable and audits", async () => {
    queue.push([{ id: PAY }]) // insert returning
    const { POST } = await import("@/app/api/finance/payables/route")
    const res = await POST(
      rq("/api/finance/payables", "POST", {
        invoiceNumber: "NEW-1",
        dueDate: "2026-08-01",
        amount: 1200,
        taxAmount: 228,
      }),
      ctx
    )
    expect(res.status).toBe(201)
    expect((await res.json()).id).toBe(PAY)
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("POST 422s on a missing due date", async () => {
    const { POST } = await import("@/app/api/finance/payables/route")
    const res = await POST(
      rq("/api/finance/payables", "POST", { invoiceNumber: "X", amount: 10 }),
      ctx
    )
    expect(res.status).toBe(422)
  })
})

describe("payable item (PATCH)", () => {
  beforeEach(reset)

  it("records a full payment → status paid", async () => {
    queue.push([{ amount: "100.00", taxAmount: "0.00", paidAmount: "0.00", status: "received" }]) // current
    queue.push([{ id: PAY, status: "paid", paidAmount: "100.00" }]) // update returning
    const { PATCH } = await import("@/app/api/finance/payables/[id]/route")
    const res = await PATCH(
      rq(`/api/finance/payables/${PAY}`, "PATCH", { action: "pay", amount: 100 }),
      ctx
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("paid")
    // update.set called with paidAmount 100.00 and status paid
    const setArg = mockDb.set.mock.calls[0]![0] as { paidAmount: string; status?: string }
    expect(setArg.paidAmount).toBe("100.00")
    expect(setArg.status).toBe("paid")
  })

  it("records a partial payment → stays open, no paid status", async () => {
    queue.push([{ amount: "100.00", taxAmount: "0.00", paidAmount: "0.00", status: "received" }])
    queue.push([{ id: PAY, status: "received", paidAmount: "40.00" }])
    const { PATCH } = await import("@/app/api/finance/payables/[id]/route")
    const res = await PATCH(
      rq(`/api/finance/payables/${PAY}`, "PATCH", { action: "pay", amount: 40 }),
      ctx
    )
    expect(res.status).toBe(200)
    const setArg = mockDb.set.mock.calls[0]![0] as { paidAmount: string; status?: string }
    expect(setArg.paidAmount).toBe("40.00")
    expect(setArg.status).toBeUndefined() // not fully paid
  })

  it("409s when the payable is already cancelled", async () => {
    queue.push([{ amount: "100.00", taxAmount: "0.00", paidAmount: "0.00", status: "cancelled" }])
    const { PATCH } = await import("@/app/api/finance/payables/[id]/route")
    const res = await PATCH(
      rq(`/api/finance/payables/${PAY}`, "PATCH", { action: "pay", amount: 10 }),
      ctx
    )
    expect(res.status).toBe(409)
    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it("404s when the payable is missing", async () => {
    queue.push([]) // current → none
    const { PATCH } = await import("@/app/api/finance/payables/[id]/route")
    const res = await PATCH(rq(`/api/finance/payables/${PAY}`, "PATCH", { action: "cancel" }), ctx)
    expect(res.status).toBe(404)
  })
})
