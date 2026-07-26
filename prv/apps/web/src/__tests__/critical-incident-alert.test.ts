import { describe, it, expect, vi, beforeEach } from "vitest"

const routeRows: unknown[] = []
const insertedValues: unknown[] = []
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(() => routeRows),
  insert: vi.fn(() => ({
    values: (v: unknown) => {
      insertedValues.push(v)
      return Promise.resolve()
    },
  })),
}
vi.mock("@prv/db", () => ({ db: mockDb }))
vi.mock("@prv/db/schema", () => ({ criticalAlertRoutes: {}, notifications: {} }))
vi.mock("drizzle-orm", async (o) => {
  const actual = await o<typeof import("drizzle-orm")>()
  return { ...actual, eq: vi.fn(), and: vi.fn() }
})

const INPUT = {
  companyId: "co-1",
  incidentId: "inc-1",
  title: "Prăbușire parțială schelă",
  location: "Șantier A",
  reporterId: "worker-1",
}

beforeEach(() => {
  vi.clearAllMocks()
  routeRows.length = 0
  insertedValues.length = 0
  mockDb.select.mockReturnThis()
  mockDb.from.mockReturnThis()
  mockDb.where.mockReturnThis()
})

describe("raiseCriticalIncidentAlert", () => {
  it("raises a requiresAck alert to the declared route recipient", async () => {
    routeRows.push({ routeToUserId: "safety-officer-1" })
    const { raiseCriticalIncidentAlert } = await import("@/lib/critical-incident-alert")
    await expect(raiseCriticalIncidentAlert(INPUT)).resolves.toBe(true)

    const row = insertedValues[0] as Record<string, unknown>
    expect(row["userId"]).toBe("safety-officer-1")
    expect(row["companyId"]).toBe("co-1")
    expect(row["requiresAck"]).toBe(true)
    expect(row["entityType"]).toBe("safety_incident")
    expect(row["entityId"]).toBe("inc-1")
    expect(String(row["title"])).toContain("Prăbușire parțială schelă")
    expect(String(row["body"])).toContain("Șantier A")
  })

  it("raises nothing when the company has no active route — recipient is never guessed", async () => {
    const { raiseCriticalIncidentAlert } = await import("@/lib/critical-incident-alert")
    await expect(raiseCriticalIncidentAlert(INPUT)).resolves.toBe(false)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("skips when the route points at the reporter themselves", async () => {
    routeRows.push({ routeToUserId: "worker-1" })
    const { raiseCriticalIncidentAlert } = await import("@/lib/critical-incident-alert")
    await expect(raiseCriticalIncidentAlert(INPUT)).resolves.toBe(false)
    expect(mockDb.insert).not.toHaveBeenCalled()
  })

  it("the trigger key is part of the routable catalog", async () => {
    const { CRITICAL_INCIDENT_TRIGGER } = await import("@/lib/critical-incident-alert")
    const { isCriticalTrigger } = await import("@/lib/critical-alert-routing")
    expect(isCriticalTrigger(CRITICAL_INCIDENT_TRIGGER)).toBe(true)
  })
})
