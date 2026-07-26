import { describe, it, expect, vi, beforeEach } from "vitest"
import type { NextRequest } from "next/server"

vi.mock("@/lib/mobile/auth", () => ({
  withMobileAuth: (handler: unknown) => handler,
}))

const auditMock = vi.fn()
vi.mock("@prv/auth", () => ({
  writeAuditLog: (...a: unknown[]) => auditMock(...a),
}))

const criticalAlertMock = vi.fn().mockResolvedValue(true)
vi.mock("@/lib/critical-incident-alert", () => ({
  raiseCriticalIncidentAlert: (...a: unknown[]) => criticalAlertMock(...a),
}))

const insertedRows: unknown[] = []
const valuesMock = vi.fn()
const mockDb = {
  insert: vi.fn(() => ({
    values: (v: unknown) => {
      valuesMock(v)
      return { returning: () => insertedRows }
    },
  })),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => ({ safetyIncidents: {} }))

interface MobileCtx {
  userId: string
  companyId: string
  sessionId: string
  role: string
}
const ctx: MobileCtx = {
  userId: "user-1",
  companyId: "company-1",
  sessionId: "sess-1",
  role: "employee",
}

function makeReq(body: unknown): NextRequest {
  return {
    method: "POST",
    nextUrl: { pathname: "/api/mobile/safety/incidents" },
    headers: { get: () => null },
    json: async () => body,
  } as unknown as NextRequest
}

const VALID = {
  title: "Scaffold plank cracked",
  description: "Third-level plank cracked underfoot; area taped off.",
  type: "near_miss",
  severity: "high",
  location: "Site A — facade scaffold",
  incidentAt: "2026-07-26T08:30:00.000Z",
}

type Handler = (req: NextRequest, ctx: MobileCtx) => Promise<Response>
async function post(body: unknown): Promise<Response> {
  const mod = await import("@/app/api/mobile/safety/incidents/route")
  return (mod.POST as unknown as Handler)(makeReq(body), ctx)
}

beforeEach(() => {
  vi.clearAllMocks()
  insertedRows.length = 0
  insertedRows.push({ id: "inc-1", title: VALID.title })
})

describe("POST /api/mobile/safety/incidents", () => {
  it("creates an open incident reported by the session user and audits it", async () => {
    const res = await post(VALID)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: "inc-1", title: VALID.title })

    const values = valuesMock.mock.calls[0]![0] as Record<string, unknown>
    expect(values["companyId"]).toBe("company-1")
    expect(values["reportedBy"]).toBe("user-1")
    expect(values["status"]).toBe("open")
    expect(values["injuriesCount"]).toBe(0)

    const audit = auditMock.mock.calls[0]![0] as Record<string, unknown>
    expect(audit["action"]).toBe("mobile.safety.incident.create")
    expect(audit["entityId"]).toBe("inc-1")
  })

  it("rejects an invalid payload with 422", async () => {
    const res = await post({ ...VALID, severity: "catastrophic" })
    expect(res.status).toBe(422)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("rejects an incidentAt from the future", async () => {
    const future = new Date(Date.now() + 60 * 60_000).toISOString()
    const res = await post({ ...VALID, incidentAt: future })
    expect(res.status).toBe(422)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("accepts a past incidentAt — an offline report replayed hours later", async () => {
    const res = await post({ ...VALID, incidentAt: "2026-07-25T19:00:00.000Z" })
    expect(res.status).toBe(201)
  })

  it("raises the routed critical alert only for critical severity", async () => {
    await post(VALID) // severity "high"
    expect(criticalAlertMock).not.toHaveBeenCalled()

    const res = await post({ ...VALID, severity: "critical" })
    expect(res.status).toBe(201)
    const arg = criticalAlertMock.mock.calls[0]![0] as Record<string, unknown>
    expect(arg["incidentId"]).toBe("inc-1")
    expect(arg["reporterId"]).toBe("user-1")
  })

  it("still answers 201 when the critical alert producer throws (fail-open)", async () => {
    criticalAlertMock.mockRejectedValueOnce(new Error("redis down"))
    const res = await post({ ...VALID, severity: "critical" })
    expect(res.status).toBe(201)
  })

  it("keeps injuriesCount when reporting an accident", async () => {
    const res = await post({ ...VALID, type: "accident", injuriesCount: 2 })
    expect(res.status).toBe(201)
    const values = valuesMock.mock.calls[0]![0] as Record<string, unknown>
    expect(values["injuriesCount"]).toBe(2)
  })
})
