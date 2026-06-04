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
