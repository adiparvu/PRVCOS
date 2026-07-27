import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

vi.mock("@/lib/mobile/auth", () => ({
  withMobileAuth: (handler: unknown) => handler,
}))
const auditMock = vi.fn()
vi.mock("@prv/auth", () => ({
  writeAuditLog: (...a: unknown[]) => auditMock(...a),
}))

const queue: unknown[][] = []
const nextResult = () => (queue.length ? (queue.shift() ?? []) : [])
const insertedValues: unknown[] = []
const insertReturn: unknown[] = []
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(() => nextResult()),
  insert: vi.fn(() => ({
    values: (v: unknown) => {
      insertedValues.push(v)
      return { returning: () => insertReturn }
    },
  })),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => ({ renovationProjects: {}, renovationSiteReports: {} }))
vi.mock("drizzle-orm", async (o) => {
  const actual = await o<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn(), desc: vi.fn() }
})

interface MobileCtx {
  userId: string
  companyId: string
  sessionId: string
  role: string
}
const ctx: MobileCtx = {
  userId: "user-1",
  companyId: "co-1",
  sessionId: "sess-1",
  role: "employee",
}

function makeReq(method: string, body?: unknown): NextRequest {
  const u = new URL("http://localhost/api/mobile/projects/proj-1/site-reports")
  return {
    method,
    nextUrl: u,
    url: u.toString(),
    headers: { get: () => null },
    json: async () => body,
  } as unknown as NextRequest
}

type Handler = (req: NextRequest, ctx: MobileCtx) => Promise<Response>
async function call(method: "GET" | "POST", body?: unknown): Promise<Response> {
  const mod = await import("@/app/api/mobile/projects/[id]/site-reports/route")
  const h = (method === "GET" ? mod.GET : mod.POST) as unknown as Handler
  return h(makeReq(method, body), ctx)
}

beforeEach(() => {
  vi.clearAllMocks()
  queue.length = 0
  insertedValues.length = 0
  insertReturn.length = 0
  for (const m of ["select", "from", "where", "orderBy"] as const) mockDb[m].mockReturnThis()
  mockDb.limit.mockImplementation(() => nextResult())
})

describe("GET /api/mobile/projects/[id]/site-reports", () => {
  it("answers renovation:false for a project with no renovation bridge", async () => {
    queue.push([]) // bridge lookup → none
    const body = await (await call("GET")).json()
    expect(body).toEqual({ renovation: false, reports: [] })
  })

  it("returns reports with photos filtered to string URLs only", async () => {
    queue.push([{ id: "reno-1" }]) // bridge
    queue.push([
      {
        id: "r1",
        reportDate: "2026-07-24",
        reportType: "daily",
        workPerformed: "Gips-carton et. 2",
        issuesEncountered: null,
        workersOnSite: 6,
        clientVisible: true,
        photos: ["https://x/a.jpg", 42, null, "https://x/b.jpg"],
      },
    ])
    const body = await (await call("GET")).json()
    expect(body.renovation).toBe(true)
    expect(body.reports[0].photos).toEqual(["https://x/a.jpg", "https://x/b.jpg"])
  })
})

describe("POST /api/mobile/projects/[id]/site-reports", () => {
  const VALID = {
    reportDate: "2026-07-27",
    workPerformed: "Șapă hol + trasee electrice băi",
    workersOnSite: 6,
    completionDelta: 5,
    clientVisible: false,
  }

  it("404s with NOT_RENOVATION when the project has no bridge (queue drops 4xx)", async () => {
    queue.push([]) // bridge → none
    const res = await call("POST", VALID)
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe("NOT_RENOVATION")
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("creates the report against the renovation project and audits it", async () => {
    queue.push([{ id: "reno-1" }]) // bridge
    insertReturn.push({ id: "sr-1", reportDate: "2026-07-27" })
    const res = await call("POST", VALID)
    expect(res.status).toBe(201)

    const values = insertedValues[0] as Record<string, unknown>
    expect(values["projectId"]).toBe("reno-1") // the renovation id, not the core id
    expect(values["submittedBy"]).toBe("user-1")
    expect(values["clientVisible"]).toBe(false)

    const audit = auditMock.mock.calls[0]![0] as Record<string, unknown>
    expect(audit["action"]).toBe("mobile.renovation.site_report.create")
    expect(audit["entityId"]).toBe("sr-1")
  })

  it("422s when workPerformed is missing", async () => {
    queue.push([{ id: "reno-1" }])
    const res = await call("POST", { reportDate: "2026-07-27" })
    expect(res.status).toBe(422)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })
})
