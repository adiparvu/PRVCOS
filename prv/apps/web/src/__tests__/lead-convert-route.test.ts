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
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  return { clients: col() }
})
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), isNull: vi.fn() }
})

const ctx = {
  session: { companyId: "company-1", userId: "actor-1", sessionId: "s1" },
  ipAddress: "127.0.0.1",
  userAgent: "test",
}
const LEAD = "11111111-1111-1111-1111-111111111111"
function rq() {
  const u = new URL(`http://localhost/api/crm/leads/${LEAD}/convert`)
  return {
    method: "POST",
    nextUrl: { pathname: u.pathname, searchParams: u.searchParams },
    url: u.toString(),
    json: async () => ({}),
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "where", "limit", "update", "set", "returning"] as const)
    mockDb[m].mockReturnThis()
}

describe("POST /api/crm/leads/[id]/convert", () => {
  beforeEach(reset)

  it("promotes a prospect to an active customer, stamps won, and audits", async () => {
    queue.push([{ metadata: { stage: "negotiation", source: "referral" }, name: "Popescu SRL" }]) // existing
    queue.push([{ id: LEAD, name: "Popescu SRL" }]) // update returning
    const { POST } = await import("@/app/api/crm/leads/[id]/convert/route")
    const res = await POST(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(LEAD)
    // status flips to active, metadata stamped won
    const setArg = mockDb.set.mock.calls[0]![0] as {
      status: string
      metadata: { stage: string; actualCloseDate?: string }
    }
    expect(setArg.status).toBe("active")
    expect(setArg.metadata.stage).toBe("won")
    expect(setArg.metadata.actualCloseDate).toBeTruthy()
    expect(auditSpy).toHaveBeenCalledTimes(1)
  })

  it("404s when the lead is not an active prospect", async () => {
    queue.push([]) // existing → none
    const { POST } = await import("@/app/api/crm/leads/[id]/convert/route")
    const res = await POST(rq(), ctx)
    expect(res.status).toBe(404)
    expect(mockDb.update).not.toHaveBeenCalled()
  })
})
