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
  where: vi.fn().mockReturnThis(),
  then: (resolve: (v: unknown[]) => void) => resolve(nextResult()),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => {
  const col = () => new Proxy({}, { get: () => ({}) })
  const mod: Record<string, unknown> = {}
  for (const t of ["clients", "users"]) mod[t] = col()
  return mod
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
function rq() {
  return {
    method: "GET",
    nextUrl: { pathname: "/api/crm/analytics", searchParams: new URLSearchParams() },
    url: "http://localhost/api/crm/analytics",
    headers: { get: () => null },
  } as unknown as Request
}
function reset() {
  vi.clearAllMocks()
  queue.length = 0
  for (const m of ["select", "from", "leftJoin", "where"] as const) mockDb[m].mockReturnThis()
}

describe("GET /api/crm/analytics", () => {
  beforeEach(reset)

  it("aggregates the lead pipeline into the analytics snapshot", async () => {
    const mk = (
      stage: string,
      source: string,
      value: number,
      rep: [string, string] | null,
      created: string,
      updated: string
    ) => ({
      metadata: { stage, source, estimatedValue: value },
      createdAt: new Date(created),
      updatedAt: new Date(updated),
      repFirstName: rep?.[0] ?? null,
      repLastName: rep?.[1] ?? null,
    })

    queue.push([
      mk("won", "referral", 4000, ["Ana", "Pop"], "2026-06-01", "2026-06-11"),
      mk("lost", "website", 2000, ["Bo", "Ion"], "2026-06-01", "2026-06-06"),
      mk("qualified", "referral", 3000, null, "2026-06-20", "2026-06-21"),
    ])

    const { GET } = await import("@/app/api/crm/analytics/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.totalLeads).toBe(3)
    expect(body.wonCount).toBe(1)
    expect(body.lostCount).toBe(1)
    expect(body.winRate).toBe(50)
    expect(body.pipelineValue).toBe(3000) // only the open qualified lead
    expect(body.avgDealSize).toBe(4000)
    expect(body.topReps[0]).toMatchObject({ rep: "Ana Pop", wonValue: 4000 })
    const referral = body.bySource.find((s: { source: string }) => s.source === "referral")
    expect(referral.won).toBe(4000)
  })

  it("defaults missing metadata to new/website/0 and never throws", async () => {
    queue.push([
      {
        metadata: {},
        createdAt: new Date("2026-06-01"),
        updatedAt: new Date("2026-06-02"),
        repFirstName: null,
        repLastName: null,
      },
      {
        metadata: null,
        createdAt: new Date("2026-06-03"),
        updatedAt: new Date("2026-06-04"),
        repFirstName: null,
        repLastName: null,
      },
    ])
    const { GET } = await import("@/app/api/crm/analytics/route")
    const res = await GET(rq(), ctx)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalLeads).toBe(2)
    expect(body.byStage.find((s: { stage: string }) => s.stage === "new").count).toBe(2)
    expect(body.pipelineValue).toBe(0)
  })
})
