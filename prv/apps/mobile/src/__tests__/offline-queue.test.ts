import { describe, it, expect, vi, beforeEach } from "vitest"

// In-memory AsyncStorage double
const storage = new Map<string, string>()
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => storage.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => void storage.set(k, v)),
    removeItem: vi.fn(async (k: string) => void storage.delete(k)),
  },
}))

const postMock = vi.fn()
const patchMock = vi.fn()
const delWithBodyMock = vi.fn()
vi.mock("@/lib/api", () => ({
  api: {
    post: (...a: unknown[]) => postMock(...a),
    patch: (...a: unknown[]) => patchMock(...a),
    delWithBody: (...a: unknown[]) => delWithBodyMock(...a),
  },
}))

import {
  enqueueMutation,
  flushQueue,
  mutateOrQueue,
  pendingCount,
  isNetworkError,
  subscribeQueue,
  type QueueSyncState,
} from "@/lib/offline-queue"

function networkError(): Error {
  const e = new TypeError("Network request failed")
  return e
}

beforeEach(() => {
  vi.clearAllMocks()
  storage.clear()
})

describe("isNetworkError", () => {
  it("treats fetch TypeError as network failure", () => {
    expect(isNetworkError(networkError())).toBe(true)
  })
  it("treats an API error message as a server verdict, not a network failure", () => {
    expect(isNetworkError(new Error("Invalid payload"))).toBe(false)
  })
})

describe("mutateOrQueue", () => {
  it("passes through when the network is up", async () => {
    patchMock.mockResolvedValue({ id: "t1", isComplete: true })
    const result = await mutateOrQueue({
      path: "/api/mobile/tasks/t1",
      method: "PATCH",
      body: { isComplete: true },
      label: "Complete task",
    })
    expect(result).toEqual({ queued: false, data: { id: "t1", isComplete: true } })
    expect(await pendingCount()).toBe(0)
  })

  it("queues durably on network failure", async () => {
    patchMock.mockRejectedValue(networkError())
    const result = await mutateOrQueue({
      path: "/api/mobile/tasks/t1",
      method: "PATCH",
      body: { isComplete: true },
      label: "Complete task",
    })
    expect(result).toEqual({ queued: true })
    expect(await pendingCount()).toBe(1)
  })

  it("rethrows server rejections instead of queueing them", async () => {
    patchMock.mockRejectedValue(new Error("VALIDATION"))
    await expect(
      mutateOrQueue({ path: "/p", method: "PATCH", body: {}, label: "x" })
    ).rejects.toThrow("VALIDATION")
    expect(await pendingCount()).toBe(0)
  })
})

describe("flushQueue", () => {
  it("replays queued items in FIFO order and empties the queue", async () => {
    await enqueueMutation({ path: "/a", method: "POST", body: { n: 1 }, label: "first" })
    await enqueueMutation({ path: "/b", method: "PATCH", body: { n: 2 }, label: "second" })
    postMock.mockResolvedValue({})
    patchMock.mockResolvedValue({})

    const result = await flushQueue()
    expect(result.sent).toBe(2)
    expect(result.remaining).toBe(0)
    expect(postMock).toHaveBeenCalledWith("/a", { n: 1 })
    expect(patchMock).toHaveBeenCalledWith("/b", { n: 2 })
    // FIFO: POST (/a) before PATCH (/b)
    expect(postMock.mock.invocationCallOrder[0]!).toBeLessThan(
      patchMock.mock.invocationCallOrder[0]!
    )
  })

  it("stops at the first network failure and keeps order", async () => {
    await enqueueMutation({ path: "/a", method: "POST", body: {}, label: "a" })
    await enqueueMutation({ path: "/b", method: "POST", body: {}, label: "b" })
    postMock.mockResolvedValueOnce({}).mockRejectedValueOnce(networkError())

    const result = await flushQueue()
    expect(result.sent).toBe(1)
    expect(result.remaining).toBe(1)
    expect(await pendingCount()).toBe(1)
  })

  it("drops server-rejected items, reports them, and continues", async () => {
    await enqueueMutation({ path: "/a", method: "POST", body: {}, label: "bad" })
    await enqueueMutation({ path: "/b", method: "POST", body: {}, label: "good" })
    postMock.mockRejectedValueOnce(new Error("CONFLICT")).mockResolvedValueOnce({})
    const onRejected = vi.fn()

    const result = await flushQueue(onRejected)
    expect(result.sent).toBe(1)
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.label).toBe("bad")
    expect(onRejected).toHaveBeenCalledTimes(1)
    expect(result.remaining).toBe(0)
  })

  it("expires items older than 48h instead of replaying them", async () => {
    await enqueueMutation({ path: "/old", method: "POST", body: {}, label: "stale" })
    // Age the item directly in storage
    const key = "prv_offline_mutation_queue"
    const queue = JSON.parse(storage.get(key)!) as Array<{ queuedAt: number }>
    queue[0]!.queuedAt = Date.now() - 49 * 60 * 60 * 1000
    storage.set(key, JSON.stringify(queue))

    const result = await flushQueue()
    expect(result.expired).toHaveLength(1)
    expect(result.sent).toBe(0)
    expect(postMock).not.toHaveBeenCalled()
    expect(await pendingCount()).toBe(0)
  })
})

describe("subscribeQueue", () => {
  it("notifies on enqueue and through a full flush, ending drained", async () => {
    const states: QueueSyncState[] = []
    const unsub = subscribeQueue((s) =>
      states.push({ ...s, progress: s.progress && { ...s.progress } })
    )

    await enqueueMutation({ path: "/a", method: "POST", body: {}, label: "A" })
    await enqueueMutation({ path: "/b", method: "POST", body: {}, label: "B" })
    expect(states.at(-1)).toEqual({ pending: 2, syncing: false })

    postMock.mockResolvedValue({})
    await flushQueue()
    // saw a syncing state with progress, and ended drained
    expect(states.some((s) => s.syncing && s.progress?.total === 2)).toBe(true)
    expect(states.at(-1)).toEqual({ pending: 0, syncing: false })
    unsub()
  })

  it("a flush stopped by a network failure ends not-syncing with items remaining", async () => {
    const states: QueueSyncState[] = []
    const unsub = subscribeQueue((s) => states.push({ ...s }))
    await enqueueMutation({ path: "/a", method: "POST", body: {}, label: "A" })
    postMock.mockRejectedValue(networkError())
    await flushQueue()
    expect(states.at(-1)).toEqual({ pending: 1, syncing: false })
    unsub()
  })

  it("stops notifying after unsubscribe", async () => {
    const listener = vi.fn()
    const unsub = subscribeQueue(listener)
    unsub()
    const before = listener.mock.calls.length
    await enqueueMutation({ path: "/a", method: "POST", body: {}, label: "A" })
    expect(listener.mock.calls.length).toBe(before)
  })
})
