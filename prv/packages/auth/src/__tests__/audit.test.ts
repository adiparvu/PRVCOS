import { describe, it, expect, vi } from "vitest"

vi.mock("@prv/db", () => ({
  db: { transaction: vi.fn(), insert: vi.fn(), select: vi.fn() },
  auditLogs: {},
}))

import { sha256hex, computeEntryHash } from "../audit"
import type { AuditEntry } from "../audit"

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    companyId: "cmp-1",
    actorId: "usr-1",
    action: "user.update",
    entityType: "user",
    entityId: "usr-2",
    gateFailed: 0,
    ...overrides,
  }
}

describe("sha256hex", () => {
  it("produces a 64-char hex string", async () => {
    const hash = await sha256hex("hello world")
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it("is deterministic", async () => {
    const a = await sha256hex("same input")
    const b = await sha256hex("same input")
    expect(a).toBe(b)
  })

  it("different inputs produce different hashes", async () => {
    const a = await sha256hex("input-a")
    const b = await sha256hex("input-b")
    expect(a).not.toBe(b)
  })
})

describe("computeEntryHash", () => {
  it("produces a 64-char hex hash", async () => {
    const entry = makeEntry()
    const hash = await computeEntryHash("id-1", entry, "0".repeat(64))
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it("is deterministic for the same inputs", async () => {
    const entry = makeEntry()
    const prevHash = "0".repeat(64)
    const h1 = await computeEntryHash("id-1", entry, prevHash)
    const h2 = await computeEntryHash("id-1", entry, prevHash)
    expect(h1).toBe(h2)
  })

  it("changes when the id changes", async () => {
    const entry = makeEntry()
    const prevHash = "0".repeat(64)
    const h1 = await computeEntryHash("id-1", entry, prevHash)
    const h2 = await computeEntryHash("id-2", entry, prevHash)
    expect(h1).not.toBe(h2)
  })

  it("changes when prevHash changes — chain integrity", async () => {
    const entry = makeEntry()
    const h1 = await computeEntryHash("id-1", entry, "a".repeat(64))
    const h2 = await computeEntryHash("id-1", entry, "b".repeat(64))
    expect(h1).not.toBe(h2)
  })

  it("chains: h2 depends on h1", async () => {
    const e1 = makeEntry({ action: "login" })
    const e2 = makeEntry({ action: "user.update" })
    const genesis = "0".repeat(64)
    const h1 = await computeEntryHash("id-1", e1, genesis)
    const h2a = await computeEntryHash("id-2", e2, h1)
    const h2b = await computeEntryHash("id-2", e2, genesis) // wrong prev
    expect(h2a).not.toBe(h2b)
  })
})

// ── verifyAuditChain ─────────────────────────────────────────────────────────

import { verifyAuditChain } from "../audit"
import { db } from "@prv/db"

interface FakeRow {
  id: string
  companyId: string
  actorId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  payload: unknown
  gateFailed: number | null
  prevHash: string
  entryHash: string
  sequenceNumber: number
}

/** Build a genuinely valid chain using the real hash implementation. */
async function buildChain(companyId: string, actions: string[]): Promise<FakeRow[]> {
  const rows: FakeRow[] = []
  let prevHash = "0".repeat(64)
  for (let i = 0; i < actions.length; i++) {
    const id = `id-${i}`
    const entry = makeEntry({ companyId, action: actions[i] })
    const entryHash = await computeEntryHash(id, entry, prevHash)
    rows.push({
      id,
      companyId,
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      payload: null,
      gateFailed: entry.gateFailed ?? 0,
      prevHash,
      entryHash,
      sequenceNumber: i + 1,
    })
    prevHash = entryHash
  }
  return rows
}

function mockSelectReturning(rows: FakeRow[]) {
  // verifyAuditChain reads newest-first (orderBy desc, limit)
  const newestFirst = [...rows].reverse()
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(newestFirst),
  }
  ;(db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain)
}

describe("verifyAuditChain", () => {
  it("declares an intact chain valid", async () => {
    const rows = await buildChain("cmp-1", ["login", "user.update", "invoice.create"])
    mockSelectReturning(rows)
    const result = await verifyAuditChain("cmp-1")
    expect(result).toMatchObject({ companyId: "cmp-1", checked: 3, valid: true })
  })

  it("detects a field edited after the fact (hash_mismatch)", async () => {
    const rows = await buildChain("cmp-1", ["login", "user.update", "invoice.create"])
    rows[1]!.action = "user.delete" // tamper with a stored field
    mockSelectReturning(rows)
    const result = await verifyAuditChain("cmp-1")
    expect(result.valid).toBe(false)
    expect(result.reason).toBe("hash_mismatch")
    expect(result.brokenAtSequence).toBe(2)
  })

  it("detects a broken link between entries (link_mismatch)", async () => {
    const rows = await buildChain("cmp-1", ["a", "b", "c"])
    // Recompute row 2 self-consistently but pointing at the wrong predecessor —
    // the classic delete-and-rehash attack.
    const fakePrev = "f".repeat(64)
    const entry = makeEntry({ companyId: "cmp-1", action: rows[2]!.action })
    rows[2]!.prevHash = fakePrev
    rows[2]!.entryHash = await computeEntryHash(rows[2]!.id, entry, fakePrev)
    mockSelectReturning(rows)
    const result = await verifyAuditChain("cmp-1")
    expect(result.valid).toBe(false)
    expect(result.reason).toBe("link_mismatch")
    expect(result.brokenAtSequence).toBe(3)
  })

  it("an empty window is trivially valid", async () => {
    mockSelectReturning([])
    const result = await verifyAuditChain("cmp-empty")
    expect(result).toMatchObject({ checked: 0, valid: true })
  })
})
