/**
 * Sprint 05 — Integration Tests: SHA-256 Audit Chain + Gate Chain
 *
 * Tests writeAuditLog and runGateChain against a stateful in-memory database
 * that simulates PostgreSQL row-locking semantics. Rows persist across calls
 * within a test, enabling full chain integrity verification.
 *
 * Acceptance criteria:
 *   - Full gate chain (all 10 gates) end-to-end with real audit log writes
 *   - Chain integrity verifier confirms integrity after 1000 sequential writes
 *   - Company isolation: independent chains per company
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { PRVSession } from "../../types"
import type { AuditEntry } from "../../audit"
import type { RouteConfig } from "../../gate-chain"

// ── Shared in-memory DB (hoisted — accessible in vi.mock factory) ─────────────

interface StoredRow {
  id: string
  sequenceNumber: number
  companyId: string
  actorId?: string
  sessionId?: string
  action: string
  entityType?: string
  entityId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any
  method?: string
  path?: string
  ipAddress?: string
  userAgent?: string
  gateFailed: number
  errorCode?: string
  prevHash: string
  entryHash: string
  createdAt: Date
}

const { store, clearStore, testDb } = vi.hoisted(() => {
  const store = new Map<string, StoredRow[]>()
  const seqRef = { n: 0 }

  function clearStore() {
    store.clear()
    seqRef.n = 0
  }

  function getRows(companyId: string): StoredRow[] {
    if (!store.has(companyId)) store.set(companyId, [])
    return store.get(companyId)!
  }

  // Extract the value from a Drizzle eq(col, value) expression.
  // eq() builds: queryChunks = ["", column, " = ", value, ""]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function eqValue(condition: any): string | undefined {
    return condition?.queryChunks?.[3]
  }

  const testDb = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction: async (callback: (tx: any) => Promise<void>) => {
      const tx = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        select: (_shape: any) => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          from: (_table: any) => ({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where: (condition: any) => ({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              orderBy: (_order: any) => ({
                limit: (_n: number) => ({
                  for: (_lock: string): Promise<{ entryHash: string }[]> => {
                    const cid = eqValue(condition)
                    if (!cid) return Promise.resolve([])
                    const rows = getRows(cid)
                    if (rows.length === 0) return Promise.resolve([])
                    return Promise.resolve([{ entryHash: rows[rows.length - 1]!.entryHash }])
                  },
                }),
              }),
            }),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        insert: (_table: any) => ({
          values: (row: StoredRow): Promise<void> => {
            getRows(row.companyId).push({
              ...row,
              sequenceNumber: ++seqRef.n,
              createdAt: new Date(),
            })
            return Promise.resolve()
          },
        }),
      }
      await callback(tx)
    },
  }

  return { store, clearStore, testDb }
})

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@prv/db", () => ({ db: testDb, auditLogs: {} }))

vi.mock("../../session", () => ({ getSession: vi.fn() }))
vi.mock("@prv/cache", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 99, limit: 100, reset: 0 }),
  getRedis: vi.fn(),
}))
vi.mock("../../security-events", () => ({
  logSecurityEvent: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("../../re-auth", () => ({ checkReauth: vi.fn().mockResolvedValue(undefined) }))

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { writeAuditLog, computeEntryHash } from "../../audit"
import { runGateChain } from "../../gate-chain"
import { getSession } from "../../session"
import { checkRateLimit } from "@prv/cache"

const mockGetSession = vi.mocked(getSession)
const mockCheckRateLimit = vi.mocked(checkRateLimit)

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<PRVSession> = {}): PRVSession {
  return {
    sessionId: "sess-int-1",
    userId: "usr-int-1",
    companyId: "cmp-int-1",
    role: "worker",
    scopeLevel: "SCOPE_RECORD",
    securityLevel: "L2",
    mfaVerified: false,
    deviceId: "dev-int-1",
    createdAt: Math.floor(Date.now() / 1000),
    expiresAt: Math.floor(Date.now() / 1000) + 28800,
    lastActiveAt: Math.floor(Date.now() / 1000),
    ...overrides,
  }
}

function makeRequest(sessionCookie?: string): Request {
  return new Request("http://localhost/api/resource", {
    headers: {
      "user-agent": "integration-test",
      ...(sessionCookie ? { cookie: `prv_session=${sessionCookie}` } : {}),
    },
  })
}

const baseConfig: RouteConfig = { action: "resource.read", endpointClass: "api_read" }

/**
 * Recomputes every entry's hash from scratch and checks the chain is unbroken.
 * Returns { valid: true } or { valid: false, brokenAt: rowIndex }.
 */
async function verifyChain(companyId: string): Promise<{ valid: boolean; brokenAt?: number }> {
  const rows = store.get(companyId) ?? []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const expectedPrev = i === 0 ? "0".repeat(64) : rows[i - 1]!.entryHash
    if (row.prevHash !== expectedPrev) return { valid: false, brokenAt: i }

    const entry: AuditEntry = {
      companyId: row.companyId,
      actorId: row.actorId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      payload: row.payload ?? undefined,
      gateFailed: row.gateFailed,
    }
    const recomputed = await computeEntryHash(row.id, entry, row.prevHash)
    if (recomputed !== row.entryHash) return { valid: false, brokenAt: i }
  }
  return { valid: true }
}

/**
 * Polls until the store has `count` rows for `companyId`, or times out.
 * Needed because writeAuditLog uses crypto.subtle.digest which is truly async
 * in Node.js and does not complete within a single event-loop tick.
 */
async function waitForWrites(companyId: string, count: number, timeoutMs = 5000) {
  await vi.waitFor(
    () => {
      const rows = store.get(companyId) ?? []
      if (rows.length < count) throw new Error(`expected ${count} rows, got ${rows.length}`)
    },
    { timeout: timeoutMs, interval: 10 }
  )
}

// ── Reset state before each test ──────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  clearStore()
  mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 99, limit: 100, reset: 0 })
})

// ── Section 1: writeAuditLog chain integrity ──────────────────────────────────

describe("writeAuditLog — chain integrity", () => {
  it("genesis entry has prevHash = '0'×64", async () => {
    await writeAuditLog({ companyId: "cmp-a", actorId: "usr-1", action: "login" })

    const rows = store.get("cmp-a") ?? []
    expect(rows).toHaveLength(1)
    expect(rows[0]!.prevHash).toBe("0".repeat(64))
    expect(rows[0]!.entryHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("each entry's prevHash equals the previous entry's entryHash", async () => {
    for (let i = 0; i < 5; i++) {
      await writeAuditLog({ companyId: "cmp-b", actorId: "usr-1", action: `action.${i}` })
    }
    const rows = store.get("cmp-b") ?? []
    expect(rows).toHaveLength(5)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.prevHash).toBe(rows[i - 1]!.entryHash)
    }
  })

  it("chain verifier confirms integrity after 5 writes", async () => {
    for (let i = 0; i < 5; i++) {
      await writeAuditLog({ companyId: "cmp-c", actorId: "usr-1", action: `op.${i}` })
    }
    expect((await verifyChain("cmp-c")).valid).toBe(true)
  })

  it("company A and company B maintain independent chains", async () => {
    for (let i = 0; i < 3; i++) {
      await writeAuditLog({ companyId: "cmp-x", actorId: "usr-x", action: `ev.${i}` })
      await writeAuditLog({ companyId: "cmp-y", actorId: "usr-y", action: `ev.${i}` })
    }

    const rowsX = store.get("cmp-x") ?? []
    const rowsY = store.get("cmp-y") ?? []

    // Each company starts from genesis
    expect(rowsX[0]!.prevHash).toBe("0".repeat(64))
    expect(rowsY[0]!.prevHash).toBe("0".repeat(64))

    // No Y prevHash points into X's hashes
    const xHashes = new Set(rowsX.map((r) => r.entryHash))
    for (const row of rowsY.slice(1)) {
      expect(xHashes.has(row.prevHash)).toBe(false)
    }

    expect((await verifyChain("cmp-x")).valid).toBe(true)
    expect((await verifyChain("cmp-y")).valid).toBe(true)
  })

  it("multiple actors in one company all land in the same chain", async () => {
    const actors = ["usr-a", "usr-b", "usr-c"]
    for (const actor of actors) {
      await writeAuditLog({ companyId: "cmp-d", actorId: actor, action: "user.update" })
    }
    const rows = store.get("cmp-d") ?? []
    expect(rows).toHaveLength(3)
    expect(rows.map((r) => r.actorId)).toEqual(actors)
    expect((await verifyChain("cmp-d")).valid).toBe(true)
  })

  it("chain verifier detects a tampered entryHash mid-chain", async () => {
    for (let i = 0; i < 5; i++) {
      await writeAuditLog({ companyId: "cmp-e", actorId: "usr-1", action: `op.${i}` })
    }
    // Corrupt row 2's entryHash — the verifier recomputes the hash for row 2 and
    // detects the mismatch at brokenAt=2 (not row 3, because the verifier checks
    // each row's own hash before checking whether the next row's prevHash matches).
    store.get("cmp-e")![2]!.entryHash = "f".repeat(64)

    const result = await verifyChain("cmp-e")
    expect(result.valid).toBe(false)
    expect(result.brokenAt).toBe(2)
  })

  it("chain verifier detects a tampered prevHash on an entry", async () => {
    for (let i = 0; i < 3; i++) {
      await writeAuditLog({ companyId: "cmp-f", actorId: "usr-1", action: `op.${i}` })
    }
    // Replace row 1's prevHash with the wrong value
    store.get("cmp-f")![1]!.prevHash = "0".repeat(64)

    const result = await verifyChain("cmp-f")
    expect(result.valid).toBe(false)
    expect(result.brokenAt).toBe(1)
  })

  it("stores all optional fields: entityType, entityId, payload, gateFailed", async () => {
    await writeAuditLog({
      companyId: "cmp-g",
      actorId: "usr-1",
      sessionId: "sess-1",
      action: "document.delete",
      entityType: "document",
      entityId: "doc-uuid-1",
      payload: { reason: "user request" },
      method: "DELETE",
      path: "/api/documents/doc-uuid-1",
      ipAddress: "10.0.0.1",
      userAgent: "TestAgent/1.0",
      gateFailed: 0,
    })
    const rows = store.get("cmp-g") ?? []
    expect(rows).toHaveLength(1)
    expect(rows[0]!.entityType).toBe("document")
    expect(rows[0]!.gateFailed).toBe(0)
    expect((await verifyChain("cmp-g")).valid).toBe(true)
  })
})

// ── Section 2: 1000-write benchmark ──────────────────────────────────────────

describe("writeAuditLog — 1000-write chain integrity benchmark", () => {
  it("chain integrity verifier confirms integrity after 1000 sequential writes", async () => {
    const cid = "cmp-bench"
    for (let i = 0; i < 1000; i++) {
      await writeAuditLog({
        companyId: cid,
        actorId: `usr-${i % 10}`,
        action: `bench.${i}`,
        entityId: crypto.randomUUID(),
        gateFailed: 0,
      })
    }
    expect(store.get(cid)).toHaveLength(1000)
    expect((await verifyChain(cid)).valid).toBe(true)
  }, 60_000)

  it("all 1000 entries have unique entryHashes", async () => {
    const cid = "cmp-unique"
    for (let i = 0; i < 1000; i++) {
      await writeAuditLog({ companyId: cid, actorId: "usr-1", action: `unique.${i}` })
    }
    const hashes = (store.get(cid) ?? []).map((r) => r.entryHash)
    expect(new Set(hashes).size).toBe(1000)
  }, 60_000)
})

// ── Section 3: Gate chain end-to-end with real audit log writes ───────────────

describe("gate chain — end-to-end with audit log integration", () => {
  it("successful request writes audit log entry with gateFailed=0", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession({ companyId: "cmp-g1" }))
    await runGateChain(makeRequest("sess-int-1"), { ...baseConfig, action: "resource.read" })
    await waitForWrites("cmp-g1", 1)

    const rows = store.get("cmp-g1") ?? []
    expect(rows).toHaveLength(1)
    expect(rows[0]!.gateFailed).toBe(0)
    expect(rows[0]!.action).toBe("resource.read")
  })

  it("gate 2 failure (MFA_REQUIRED) writes audit log with gateFailed=2", async () => {
    mockGetSession.mockResolvedValueOnce(
      makeSession({ role: "ceo", mfaVerified: false, companyId: "cmp-g2" })
    )
    await expect(runGateChain(makeRequest("sess-int-1"), baseConfig)).rejects.toMatchObject({
      code: "MFA_REQUIRED",
    })
    await waitForWrites("cmp-g2", 1)

    const rows = store.get("cmp-g2") ?? []
    expect(rows).toHaveLength(1)
    expect(rows[0]!.gateFailed).toBe(2)
    expect(rows[0]!.errorCode).toBe("MFA_REQUIRED")
  })

  it("gate 4 failure (INSUFFICIENT_ROLE) writes audit log with gateFailed=4", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession({ role: "worker", companyId: "cmp-g4" }))
    const { RoleSets } = await import("../../permissions")
    await expect(
      runGateChain(makeRequest("sess-int-1"), { ...baseConfig, requiredRoles: RoleSets.admin })
    ).rejects.toMatchObject({ code: "INSUFFICIENT_ROLE" })
    await waitForWrites("cmp-g4", 1)

    const rows = store.get("cmp-g4") ?? []
    expect(rows).toHaveLength(1)
    expect(rows[0]!.gateFailed).toBe(4)
  })

  it("gate 7 failure (RATE_LIMITED) writes audit log with gateFailed=7", async () => {
    mockGetSession.mockResolvedValueOnce(makeSession({ companyId: "cmp-g7" }))
    mockCheckRateLimit.mockResolvedValueOnce({ success: false, remaining: 0, limit: 10, reset: 0 })
    await expect(runGateChain(makeRequest("sess-int-1"), baseConfig)).rejects.toMatchObject({
      code: "RATE_LIMITED",
    })
    await waitForWrites("cmp-g7", 1)

    const rows = store.get("cmp-g7") ?? []
    expect(rows).toHaveLength(1)
    expect(rows[0]!.gateFailed).toBe(7)
    expect(rows[0]!.errorCode).toBe("RATE_LIMITED")
  })

  it("multiple requests for same company form a valid audit chain", async () => {
    const cid = "cmp-chain"

    mockGetSession.mockResolvedValueOnce(makeSession({ companyId: cid }))
    await runGateChain(makeRequest("sess-int-1"), baseConfig)
    await waitForWrites(cid, 1)

    mockGetSession.mockResolvedValueOnce(
      makeSession({ role: "ceo", mfaVerified: false, companyId: cid })
    )
    await expect(runGateChain(makeRequest("sess-int-1"), baseConfig)).rejects.toBeDefined()
    await waitForWrites(cid, 2)

    mockGetSession.mockResolvedValueOnce(makeSession({ companyId: cid }))
    await runGateChain(makeRequest("sess-int-1"), baseConfig)
    await waitForWrites(cid, 3)

    const rows = store.get(cid) ?? []
    expect(rows).toHaveLength(3)
    expect(rows[0]!.gateFailed).toBe(0)
    expect(rows[1]!.gateFailed).toBe(2)
    expect(rows[2]!.gateFailed).toBe(0)
    expect((await verifyChain(cid)).valid).toBe(true)
  })

  it("company isolation: two companies produce independent audit chains", async () => {
    const cmpA = "cmp-iso-a"
    const cmpB = "cmp-iso-b"

    for (let i = 0; i < 3; i++) {
      mockGetSession.mockResolvedValueOnce(makeSession({ companyId: cmpA }))
      await runGateChain(makeRequest("sess-int-1"), baseConfig)
      await waitForWrites(cmpA, i + 1)

      mockGetSession.mockResolvedValueOnce(makeSession({ companyId: cmpB }))
      await runGateChain(makeRequest("sess-int-1"), baseConfig)
      await waitForWrites(cmpB, i + 1)
    }

    expect(store.get(cmpA)).toHaveLength(3)
    expect(store.get(cmpB)).toHaveLength(3)
    expect((await verifyChain(cmpA)).valid).toBe(true)
    expect((await verifyChain(cmpB)).valid).toBe(true)

    // No prevHash from company B appears in company A's hashes
    const aHashes = new Set((store.get(cmpA) ?? []).map((r) => r.entryHash))
    for (const row of (store.get(cmpB) ?? []).slice(1)) {
      expect(aHashes.has(row.prevHash)).toBe(false)
    }
  })

  it("gate 1 failure (SESSION_NOT_FOUND) writes no audit entry — session is unknown", async () => {
    // No cookie → session is null → companyId unknown → no audit can be written
    await expect(runGateChain(makeRequest(), baseConfig)).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
    })
    // Wait a short time; no writes are expected
    await new Promise<void>((resolve) => setTimeout(resolve, 100))

    let total = 0
    for (const rows of store.values()) total += rows.length
    expect(total).toBe(0)
  })
})
