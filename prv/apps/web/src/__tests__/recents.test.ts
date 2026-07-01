import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { recordRecent, getRecents, clearRecents, RECENTS_MAX_PER_MODULE } from "@/lib/recents"

// Minimal in-memory localStorage + window so the (browser-only) recents module
// runs under the node test environment without pulling in jsdom.
function makeStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  }
}

beforeEach(() => {
  ;(globalThis as unknown as { window: unknown }).window = { localStorage: makeStorage() }
})
afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window
})

const proj = (id: string, label = `Project ${id}`) => ({
  entityType: "project",
  entityId: id,
  label,
  href: `/projects/${id}`,
  module: "projects",
})

describe("recents", () => {
  it("records and returns entries newest-first", () => {
    recordRecent(proj("a"), 1000)
    recordRecent(proj("b"), 2000)
    const list = getRecents()
    expect(list.map((r) => r.entityId)).toEqual(["b", "a"])
  })

  it("de-dupes by entity and bumps a re-view to the front", () => {
    recordRecent(proj("a"), 1000)
    recordRecent(proj("b"), 2000)
    recordRecent(proj("a"), 3000)
    const list = getRecents()
    expect(list.map((r) => r.entityId)).toEqual(["a", "b"])
    expect(list).toHaveLength(2)
  })

  it("caps each module at RECENTS_MAX_PER_MODULE entries", () => {
    for (let i = 0; i < RECENTS_MAX_PER_MODULE + 5; i++) {
      recordRecent(proj(`p${i}`), 1000 + i)
    }
    expect(getRecents({ module: "projects" })).toHaveLength(RECENTS_MAX_PER_MODULE)
  })

  it("filters by module and honors limit", () => {
    recordRecent(proj("a"), 1000)
    recordRecent(
      {
        entityType: "product",
        entityId: "x",
        label: "Drill",
        href: "/commerce/x",
        module: "commerce",
      },
      2000
    )
    expect(getRecents({ module: "commerce" }).map((r) => r.entityId)).toEqual(["x"])
    expect(getRecents({ limit: 1 })).toHaveLength(1)
  })

  it("clears one module's bucket or all recents", () => {
    recordRecent(proj("a"), 1000)
    recordRecent(
      {
        entityType: "product",
        entityId: "x",
        label: "Drill",
        href: "/commerce/x",
        module: "commerce",
      },
      2000
    )
    clearRecents("projects")
    expect(getRecents().map((r) => r.module)).toEqual(["commerce"])
    clearRecents()
    expect(getRecents()).toHaveLength(0)
  })

  it("is a no-op when storage is unavailable (SSR)", () => {
    delete (globalThis as unknown as { window?: unknown }).window
    expect(() => recordRecent(proj("a"))).not.toThrow()
    expect(getRecents()).toEqual([])
  })
})
